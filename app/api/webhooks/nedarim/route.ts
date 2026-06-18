import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { recomputeCampaignRaised } from '@/lib/donations'

/**
 * Nedarim Plus server callback (CallBack).
 * Embed this URL in the Nedarim Plus Mosad settings / send it as the CallBack:
 *   https://www.kafool.com/api/webhooks/nedarim
 *
 * Nedarim POSTs application/json from IP 18.194.219.73 with (approximately):
 *   TransactionId, Amount, Currency, ClientName, Phone, Mail, Confirmation,
 *   TransactionType (Ragil | HostHK/HK | CreateToken), Tashloumim, MosadNumber,
 *   Param1, Param2
 * We route by Param1 = campaign id. For a הוראת קבע we record the FULL
 * commitment (Amount × Tashloumim), matching how the Kesher flow records it.
 *
 * NOTE: the donor-facing Nedarim iframe payment flow is a separate piece and is
 * not wired into the donation page yet — this endpoint only records the result.
 */

// flexible getter — Nedarim casing varies between integrations
function pick(body: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = body[k] ?? body[k.toLowerCase()] ?? body[k.toUpperCase()]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

async function handle(body: Record<string, unknown>, ip: string): Promise<void> {
  console.log('Nedarim webhook from', ip, '·', JSON.stringify(body).slice(0, 1000))

  const transactionId = pick(body, 'TransactionId', 'TransactionID', 'Id')
  const confirmation  = pick(body, 'Confirmation', 'ConfirmationNumber', 'Asmachta')
  // a transaction with a confirmation/approval number is an approved payment
  if (!transactionId || !confirmation) {
    console.log('Nedarim webhook: no confirmed transaction — ignoring')
    return
  }

  const campaignId = pick(body, 'Param1', 'param1') || null
  if (!campaignId) {
    console.warn('Nedarim webhook: no campaign id in Param1 — ignoring')
    return
  }

  const supabase = await createServiceClient()
  const { data: campaign } = await supabase
    .from('campaigns').select('org_id').eq('id', campaignId).maybeSingle()
  if (!campaign) {
    console.warn('Nedarim webhook: campaign not found:', campaignId)
    return
  }

  // Standing order? TransactionType is HK/HostHK for הוראת קבע, Ragil for one-time.
  const txType = pick(body, 'TransactionType', 'PaymentType').toLowerCase()
  const isHok = txType.includes('hk') || txType.includes('hok')
  const monthly = Number(pick(body, 'Amount', 'Sum', 'Mount')) || 0
  const months = Number(pick(body, 'Tashloumim', 'Tashlumim', 'Payments')) || 0
  const recordedAmount = isHok && months > 1 ? monthly * months : monthly

  const donorName  = pick(body, 'ClientName', 'Name') || null
  const donorPhone = pick(body, 'Phone', 'Tel') || null
  const donorEmail = pick(body, 'Mail', 'Email') || null

  // optional group attribution — the iframe passes the group slug in Param2
  const groupSlug = pick(body, 'Param2', 'param2')
  let groupId: string | null = null
  if (groupSlug) {
    const { data: g } = await supabase
      .from('groups').select('id').eq('campaign_id', campaignId).eq('slug', groupSlug).maybeSingle()
    groupId = g?.id ?? null
  }

  // insert-if-absent (idempotent); reuse kesher_transaction_id as the external id
  const { data: existing } = await supabase
    .from('donations').select('id').eq('kesher_transaction_id', transactionId).maybeSingle()
  if (!existing) {
    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: recordedAmount,
      donor_name: donorName,
      donor_phone: donorPhone,
      donor_email: donorEmail,
      group_id: groupId,
      kesher_transaction_id: transactionId,
      payment_status: 'completed',
      payment_type: isHok ? 'hok' : 'one_time',
      installments: isHok && months > 0 ? months : null,
      monthly_amount: isHok ? monthly : null,
      kesher_raw: body,
    })
  }

  // raised_amount = sum of completed donations (drift-free)
  await recomputeCampaignRaised(supabase, campaignId)
  console.log(`Nedarim webhook: ₪${recordedAmount} (${isHok ? `hok ${months}m` : 'one-time'}) for campaign ${campaignId}`)
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  let body: Record<string, unknown> = {}
  try {
    const ct = req.headers.get('content-type') || ''
    const raw = await req.text()
    if (ct.includes('application/json')) {
      body = JSON.parse(raw)
    } else {
      try { body = JSON.parse(raw) } catch {
        new URLSearchParams(raw).forEach((v, k) => { body[k] = v })
      }
    }
  } catch (e) {
    console.error('Nedarim webhook parse error:', e)
    return NextResponse.json({ ok: true })
  }

  try {
    await handle(body, ip)
  } catch (err) {
    console.error('Nedarim webhook error:', err)
  }
  // always 200 so Nedarim doesn't retry endlessly
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-nedarim-webhook' })
}
