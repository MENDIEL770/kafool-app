// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// KesherStatus codes = success
const SUCCESS_CODES = [4, 11]

// Shared processing — records the donation and returns a short note. Kesher sends
// TWO shapes that we correlate by obligationRef:
//   A) transaction confirmation (GET): { total, addData(=campaignId), isSucces,
//      transactionNumber, obligationRef, moreData(=group?) } — has the amount+campaign.
//   B) obligation/customer event (POST): { Type, Customer{FirstName,LastName,Phone,
//      Mail}, Obligation{Sum, PaymentPageNum, ObligationReference} } — has the donor.
async function handle(body: Record<string, unknown>): Promise<string> {
  const supabase = await createServiceClient()

  // ── Format A: transaction confirmation — record the donation ──
  if (body.isSucces !== undefined || body.transactionNumber !== undefined) {
    const success = String(body.isSucces ?? '').toLowerCase() === 'true'
    if (!success) return `ignored: isSucces=${body.isSucces}`
    // addData = "campaignId" or "campaignId|groupSlug" (we encode the group there)
    const rawAdd = String(body.addData ?? body.Details ?? body.adddata ?? body.ref ?? '').trim()
    const [addCampaign, addGroup] = rawAdd.split('|')
    const campaignId = (addCampaign || '').trim() || null
    const amount = Number(String(body.total ?? body.Sum ?? 0).replace(/[^\d.]/g, '')) || 0
    const txn = String(body.transactionNumber ?? body.NumTransaction ?? '').trim()
    const obligationRef = String(body.obligationRef ?? '').trim()
    const groupSlug = (addGroup || String(body.group ?? body.moreData ?? body.dg ?? '')).trim() || null
    if (!campaignId) return `ignored: no campaign (addData empty), txn ${txn}`
    const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).single()
    if (!campaign) return `ignored: campaign not found (${campaignId})`

    // enrich donor name/phone from a matching Format-B obligation event (same ref)
    let donorName: string | null = null, donorPhone: string | null = null, donorEmail: string | null = null
    if (obligationRef) {
      const { data: logs } = await supabase.from('webhook_logs').select('body').eq('source', 'kesher').order('created_at', { ascending: false }).limit(50)
      for (const l of logs ?? []) {
        const c = (l.body as Record<string, unknown>)?.Customer as Record<string, unknown> | undefined
        const o = (l.body as Record<string, unknown>)?.Obligation as Record<string, unknown> | undefined
        if (c && o && String(o.ObligationReference ?? '') === obligationRef) {
          donorName = [c.FirstName, c.LastName].filter(Boolean).join(' ').trim() || null
          donorPhone = (c.Phone as string) || null
          donorEmail = (c.Mail as string) || null
          break
        }
      }
    }

    let groupId: string | null = null
    if (groupSlug) {
      const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', groupSlug).maybeSingle()
      groupId = g?.id ?? null
    }

    const { data: existing } = await supabase.from('donations').select('id').eq('kesher_transaction_id', txn).maybeSingle()
    if (!existing && txn) {
      await supabase.from('donations').insert({
        campaign_id: campaignId, org_id: campaign.org_id, amount,
        donor_name: donorName, donor_phone: donorPhone, donor_email: donorEmail, group_id: groupId,
        kesher_transaction_id: txn, payment_status: 'completed', kesher_raw: body,
      })
    }
    const { recomputeCampaignRaised } = await import('@/lib/donations')
    await recomputeCampaignRaised(supabase, campaignId)
    return existing ? `duplicate: txn ${txn}` : `recorded: ₪${amount} txn ${txn} (${donorName || '?'}, ${donorPhone || '?'}) -> ${campaignId}`
  }

  // ── Format B: obligation/customer event — kept (logged) for enrichment only ──
  if (body.Customer && body.Obligation) {
    const ref = (body.Obligation as Record<string, unknown>)?.ObligationReference
    return `obligation event Type=${body.Type} ref=${ref} (logged for enrichment)`
  }

  // ── legacy format (KesherStatus 4/11) ──
  const kesherStatus = Number(body?.KesherStatus ?? 0)
  if (SUCCESS_CODES.includes(kesherStatus)) {
    const campaignId = String(body?.Details ?? body?.adddata ?? body?.ref ?? '').trim() || null
    const txn = String(body?.NumTransaction ?? '').trim()
    if (campaignId && txn) {
      const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).single()
      if (campaign) {
        const { data: existing } = await supabase.from('donations').select('id').eq('kesher_transaction_id', txn).maybeSingle()
        if (!existing) await supabase.from('donations').insert({ campaign_id: campaignId, org_id: campaign.org_id, amount: Number(body?.Sum ?? 0), donor_name: String(body?.ReceiptName ?? '').trim() || null, kesher_transaction_id: txn, payment_status: 'completed', kesher_raw: body })
        const { recomputeCampaignRaised } = await import('@/lib/donations')
        await recomputeCampaignRaised(supabase, campaignId)
        return existing ? `duplicate (legacy): txn ${txn}` : `recorded (legacy): ₪${body?.Sum} txn ${txn}`
      }
    }
  }

  return `ignored: unrecognized/non-success payload (keys: ${Object.keys(body).slice(0, 8).join(',')})`
}

// Capture every incoming call (raw) so we can see exactly what Kesher sends.
async function logAndHandle(body: Record<string, unknown>, ip: string, method: string): Promise<void> {
  let logId: string | null = null
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase.from('webhook_logs').insert({ source: 'kesher', ip, body: { ...body, __method: method } }).select('id').single()
    logId = data?.id ?? null
  } catch (e) { console.error('Kesher webhook log error:', e) }

  let note = 'error'
  try { note = await handle(body) } catch (err) { note = `error: ${err instanceof Error ? err.message : String(err)}` }
  console.log('Kesher webhook:', note)

  if (logId) { try { const supabase = await createServiceClient(); await supabase.from('webhook_logs').update({ note }).eq('id', logId) } catch { /* ignore */ } }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  let body: Record<string, unknown> = {}
  try {
    const ct = req.headers.get('content-type') || ''
    const raw = await req.text()
    if (ct.includes('application/json')) body = JSON.parse(raw)
    else { try { body = JSON.parse(raw) } catch { new URLSearchParams(raw).forEach((v, k) => { body[k] = v }) } }
  } catch { return NextResponse.json({ ok: true }) }

  await logAndHandle(body, ip, 'POST')
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.size === 0) return NextResponse.json({ ok: true, service: 'kafool-kesher-webhook' })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body: Record<string, unknown> = {}
  searchParams.forEach((value, key) => { body[key] = value })
  await logAndHandle(body, ip, 'GET')
  return NextResponse.json({ ok: true })
}
