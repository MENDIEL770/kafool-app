import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifySignature,
  isSuccessfulPayment,
  parseKesherPayload,
  type KesherWebhookPayload,
} from '@/lib/kesher/webhook'
import { renderTemplate, sendSms } from '@/lib/sms/sender'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Log immediately — always store webhook for audit trail
  let payload: KesherWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const signature = request.headers.get('x-kesher-signature') || ''
  const secret = process.env.KESHER_WEBHOOK_SECRET || ''
  const signatureValid = verifySignature(rawBody, signature, secret)

  const supabase = await createServiceClient()

  await supabase.from('webhook_logs').insert({
    source: 'kesher',
    payload,
    signature_valid: signatureValid,
    processed: false,
  })

  if (!signatureValid) {
    console.warn('[Kesher Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Only process successful payments
  if (!isSuccessfulPayment(payload)) {
    const status = payload.Transaction?.KesherStatus ?? payload.KesherStatus
    console.log(`[Kesher Webhook] Skipping status ${status}`)
    return NextResponse.json({ ok: true, skipped: `status_${status}` })
  }

  const parsed = parseKesherPayload(payload)

  if (!parsed.transactionId) {
    return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
  }

  // Idempotency — skip if already processed
  const { data: existing } = await supabase
    .from('donations')
    .select('id')
    .eq('kesher_transaction_id', parsed.transactionId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, skipped: 'already_processed' })
  }

  // Resolve campaign
  let campaign: { id: string; org_id: string; slug: string; title: string } | null = null

  if (parsed.campaignId) {
    const { data } = await supabase
      .from('campaigns')
      .select('id, org_id, slug, title')
      .eq('id', parsed.campaignId)
      .single()
    campaign = data
  }

  if (!campaign) {
    console.error('[Kesher Webhook] Campaign not found:', parsed.campaignId)
    await supabase
      .from('webhook_logs')
      .update({ error: `Campaign not found: ${parsed.campaignId}`, processed: false })
      .eq('payload->Transaction->>NumTransaction', parsed.transactionId)
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Resolve group if provided
  let groupId: string | null = null
  if (parsed.groupSlug) {
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('slug', parsed.groupSlug)
      .maybeSingle()
    groupId = group?.id ?? null
  }

  // Create donation record
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .insert({
      campaign_id: campaign.id,
      org_id: campaign.org_id,
      amount: parsed.amount,
      currency: 'ILS',
      donor_name: parsed.donorName,
      donor_phone: parsed.donorPhone,
      donor_email: parsed.donorEmail,
      dedication: parsed.dedication,
      group_id: groupId,
      caller_id: parsed.callerId || null,
      payment_status: 'completed',
      kesher_transaction_id: parsed.transactionId,
      kesher_raw: payload,
    })
    .select()
    .single()

  if (donationError || !donation) {
    console.error('[Kesher Webhook] Failed to create donation:', donationError)
    await supabase
      .from('webhook_logs')
      .update({ error: donationError?.message, processed: false })
      .eq('payload->Transaction->>NumTransaction', parsed.transactionId)
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 })
  }

  // Atomically increment raised_amount on campaign (and group if applicable)
  await supabase.rpc('increment_campaign_raised', {
    p_campaign_id: campaign.id,
    p_group_id: groupId,
    p_amount: parsed.amount,
  })

  // Create dedication wall entry if provided
  if (parsed.dedication && parsed.donorName) {
    await supabase.from('dedications').insert({
      donation_id: donation.id,
      campaign_id: campaign.id,
      org_id: campaign.org_id,
      dedicator_name: parsed.donorName,
      message: parsed.dedication,
      show_on_wall: true,
    })
  }

  // Run automation rules (SMS etc.)
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('trigger_event', 'donation_completed')
    .eq('is_active', true)

  for (const rule of rules || []) {
    if (rule.action_type === 'send_sms' && parsed.donorPhone) {
      const message = renderTemplate(rule.template, {
        donor_name: parsed.donorName || 'תורם יקר',
        amount: String(parsed.amount),
        campaign_name: campaign.title,
      })
      const result = await sendSms({ to: parsed.donorPhone, message })
      await supabase.from('sms_logs').insert({
        org_id: campaign.org_id,
        campaign_id: campaign.id,
        donation_id: donation.id,
        to_phone: parsed.donorPhone,
        message,
        status: result.success ? 'sent' : 'failed',
        provider_id: result.providerId,
        sent_at: result.success ? new Date().toISOString() : null,
      })
    }
  }

  // Mark webhook as processed
  await supabase
    .from('webhook_logs')
    .update({ processed: true })
    .eq('payload->Transaction->>NumTransaction', parsed.transactionId)

  console.log(`[Kesher Webhook] ✅ Donation ${donation.id} created — ₪${parsed.amount} for campaign ${campaign.slug}`)

  return NextResponse.json({ ok: true, donationId: donation.id })
}
