// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// KesherStatus codes = success
const SUCCESS_CODES = [4, 11]

// Shared processing — records the donation and returns a short note describing
// what happened, which is also stored on the webhook_logs row for diagnostics.
async function handle(body: Record<string, unknown>): Promise<string> {
  const paymentPageNum = String(body?.PaymentPageNum ?? body?.ProjectNumber ?? '')
  const ALLOWED_PAGES = (process.env.KESHER_ALLOWED_PAGES || '').split(',').map(s => s.trim()).filter(Boolean)
  if (ALLOWED_PAGES.length > 0 && paymentPageNum && !ALLOWED_PAGES.includes(paymentPageNum)) {
    return `ignored: page ${paymentPageNum} not in KESHER_ALLOWED_PAGES`
  }

  const kesherStatus = Number(body?.KesherStatus ?? 0)
  if (!SUCCESS_CODES.includes(kesherStatus)) {
    return `ignored: not success (KesherStatus=${kesherStatus || '∅'})`
  }

  const amountTotal = Number(body?.Sum ?? body?.total ?? 0)
  const numTransaction = String(body?.NumTransaction ?? body?.transactionNumber ?? '')
  const campaignId = String(body?.Details ?? body?.adddata ?? body?.ref ?? '').trim() || null
  const donorName = String(body?.ReceiptName ?? body?.dn ?? '').trim() || null
  const groupSlug = String(body?.group ?? body?.dg ?? '').trim() || null

  if (!campaignId) return `ignored: no campaignId (Details/adddata/ref empty), page=${paymentPageNum}, ₪${amountTotal}`

  const supabase = await createServiceClient()
  const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).single()
  if (!campaign) return `ignored: campaign not found (${campaignId})`

  // optional group attribution
  let groupId: string | null = null
  if (groupSlug) {
    const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', groupSlug).maybeSingle()
    groupId = g?.id ?? null
  }

  // insert-if-absent (the thank-you page is the authority for online card flows)
  const { data: existing } = await supabase
    .from('donations').select('id').eq('kesher_transaction_id', numTransaction).maybeSingle()
  if (!existing && numTransaction) {
    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: amountTotal,
      donor_name: donorName,
      group_id: groupId,
      kesher_transaction_id: numTransaction,
      payment_status: 'completed',
      kesher_raw: body,
    })
  }

  const { recomputeCampaignRaised } = await import('@/lib/donations')
  await recomputeCampaignRaised(supabase, campaignId)
  return existing
    ? `duplicate: txn ${numTransaction} already recorded`
    : `recorded: ₪${amountTotal} txn ${numTransaction} -> campaign ${campaignId}${groupId ? ` group ${groupId}` : ''}`
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
