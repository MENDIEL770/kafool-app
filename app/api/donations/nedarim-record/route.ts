import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { recomputeCampaignRaised, attachCustomData } from '@/lib/donations'

/**
 * Record a Nedarim Plus donation from the client right after the iframe reports
 * success. This is a reliable backstop to the server CallBack webhook — it works
 * even if the Mosad's CallBack isn't configured. Idempotent with the webhook:
 * both dedupe on kesher_transaction_id, so a donation is never counted twice.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const campaignId = String(body.campaignId || '')
  const transactionId = String(body.transactionId || '').trim()
  const monthly = Number(body.amount) || 0
  if (!campaignId || !transactionId || monthly <= 0) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })

  const isHok = !!body.isHok
  const months = Number(body.months) || 0
  const recordedAmount = isHok && months > 1 ? monthly * months : monthly

  let groupId: string | null = null
  if (body.groupSlug) {
    const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', body.groupSlug).maybeSingle()
    groupId = g?.id ?? null
  }

  const donor = body.donor || {}
  const name = [donor.firstName, donor.lastName].filter(Boolean).join(' ').trim() || null

  const { data: existing } = await supabase.from('donations').select('id').eq('kesher_transaction_id', transactionId).maybeSingle()
  if (!existing) {
    const { data: inserted } = await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: recordedAmount,
      donor_name: name,
      donor_phone: donor.phone || null,
      donor_email: donor.email || null,
      dedication: body.comment || null,
      group_id: groupId,
      kesher_transaction_id: transactionId,
      payment_status: 'completed',
      payment_type: isHok ? 'hok' : 'one_time',
      installments: isHok && months > 0 ? months : null,
      monthly_amount: isHok ? monthly : null,
    }).select('id').single()
    if (inserted) {
      await attachCustomData(supabase, { donationId: inserted.id, campaignId, phone: donor.phone || null, amount: monthly })
    }
  }
  await recomputeCampaignRaised(supabase, campaignId)
  return NextResponse.json({ ok: true })
}
