// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { webhookAuthorized } from '@/lib/webhook-auth'

// KesherStatus codes = success
const SUCCESS_CODES = [4, 11]

const normPhone = (p: unknown) => String(p ?? '').replace(/\D/g, '').replace(/^972/, '0').slice(-10)

// A הו"ק is identified across BOTH Kesher shapes by its obligation reference:
// the establishment event (Format B) and the eventual charge (Format A) share it.
// We dedup on it so a deferred הו"ק recorded at setup isn't recorded again when
// its first charge finally posts. Checks the dedicated column and (for older rows
// that predate it) the ref stored inside kesher_raw.
async function hokAlreadyRecorded(supabase: any, campaignId: string, ref: string): Promise<boolean> {
  if (!ref) return false
  const { data: a } = await supabase.from('donations').select('id')
    .eq('campaign_id', campaignId).eq('kesher_obligation_ref', ref).limit(1)
  if (a && a.length) return true
  const { data: b } = await supabase.from('donations').select('id')
    .eq('campaign_id', campaignId).filter('kesher_raw->>obligationRef', 'eq', ref).limit(1)
  return !!(b && b.length)
}

// Kesher sends an "obligation established" event (Format B) the moment a הו"ק is
// set up — BEFORE the first charge. For a הו"ק whose first charge is a future
// date (e.g. "charge on the 2nd of each month"), the transaction event (Format A)
// won't arrive for days, so without this the commitment is invisible in Kafool.
// We record it immediately as a completed הו"ק (the full commitment, so it counts
// and the donor sees it right away), routed to the campaign/group via the Kafool
// intent the donor filled — which also scopes recording to donations that came
// through Kafool (other orgs' obligations on the same webhook find no intent and
// are skipped). When the real charge later posts, hokAlreadyRecorded dedups it.
async function recordObligationHok(supabase: any, body: Record<string, unknown>): Promise<string> {
  const cust = (body.Customer as Record<string, unknown>) || {}
  const obl = (body.Obligation as Record<string, unknown>) || {}
  const ref = String(obl.ObligationReference ?? obl.ObligationApiIdentity ?? '').trim()
  const sum = Number(obl.Sum) || 0
  const status = Number(obl.ObligationStatus)
  const chargeDay = Number(obl.ChargeDay) || null
  const startDate = String(obl.StartDate ?? '').trim() // DD/MM/YYYY
  let months = Number(obl.NumPayments) || 0
  if (!ref) return `obligation: no ref — logged only`
  if (sum <= 0) return `obligation ${ref}: sum<=0 — logged only`
  // ObligationStatus 1 = active. Skip cancelled/closed/edited-away obligations.
  if (status && status !== 1) return `obligation ${ref}: status ${status} (not active) — logged only`

  const phone = String(cust.Phone ?? '').trim()
  const email = String(cust.Mail ?? '').trim() || null
  const custName = [cust.FirstName, cust.LastName].filter(Boolean).join(' ').trim() || null

  // Route to a Kafool campaign+group via the donor's recent הו"ק intent.
  const np = normPhone(phone)
  if (!np) return `obligation ${ref}: no donor phone — logged only`
  const sinceIso = new Date(Date.now() - 3 * 864e5).toISOString()
  const { data: cands } = await supabase.from('donation_intents')
    .select('campaign_id, group_slug, phone, donor_email, amount, custom_data, created_at')
    .gt('created_at', sinceIso).order('created_at', { ascending: false }).limit(300)
  const mine = (cands || []).filter((c: any) =>
    normPhone(c.phone) === np && String((c.custom_data || {}).__method || '') === 'hok')
  const intent = mine.find((c: any) => Math.round(Number(c.amount)) === Math.round(sum)) || mine[0] || null
  if (!intent) return `obligation ${ref}: no matching Kafool הו"ק intent (phone ${phone}) — logged only`

  const campaignId = intent.campaign_id as string
  const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).single()
  if (!campaign) return `obligation ${ref}: campaign not found — logged only`
  if (await hokAlreadyRecorded(supabase, campaignId, ref)) return `duplicate obligation ${ref}`

  // Finite plan (1..120 months) → record the full commitment (Sum × months). An
  // open-ended obligation (e.g. NumPayments 9999) has no bounded total → record
  // the monthly sum only.
  if (!(months > 0 && months <= 120)) months = 0
  const amount = months > 0 ? sum * months : sum

  let groupId: string | null = null
  const gslug = String(intent.group_slug ?? '').trim()
  if (gslug) {
    const { data: g } = await supabase.from('groups').select('id')
      .eq('campaign_id', campaignId).eq('slug', gslug).maybeSingle()
    groupId = g?.id ?? null
  }

  const donorName = custName || String((intent.custom_data || {}).__name || '').trim() || null
  const donorPhone = phone || (intent.phone as string) || null
  const donorEmail = email || (intent.donor_email as string) || null

  await supabase.from('donations').insert({
    campaign_id: campaignId, org_id: campaign.org_id, amount,
    donor_name: donorName, donor_phone: donorPhone, donor_email: donorEmail, group_id: groupId,
    kesher_transaction_id: `hok:${ref}`, kesher_obligation_ref: ref,
    payment_status: 'completed', payment_type: 'hok',
    monthly_amount: sum, installments: months > 0 ? months : null,
    kesher_raw: body,
    custom_data: { ...(intent.custom_data || {}), __name: donorName, __method: 'hok', __charge_day: chargeDay, __starts_at: startDate },
  })
  const { recomputeCampaignRaised } = await import('@/lib/donations')
  await recomputeCampaignRaised(supabase, campaignId)
  return `recorded obligation הו"ק ${ref}: ₪${amount} (${donorName || '?'}) day ${chargeDay} start ${startDate} -> ${campaignId}`
}

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

    // Fallback: Kesher's Format-B obligation event (with the Customer block) often
    // doesn't arrive — or not in time — which left the donation nameless (shown as
    // "אנונימי"). Recover the donor from the INTENT the donor filled right before
    // paying: match by amount within a recent window, preferring an exact amount
    // match, else the single most-recent named intent in the last 12 minutes.
    if (!donorName) {
      const sinceIso = new Date(Date.now() - 90 * 60_000).toISOString()
      const { data: cands } = await supabase
        .from('donation_intents')
        .select('phone, donor_email, custom_data, amount, created_at')
        .eq('campaign_id', campaignId)
        .gt('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(30)
      const named = (cands ?? []).filter(c => String((c.custom_data as Record<string, unknown> | null)?.__name || '').trim())
      const recent12 = named.filter(c => new Date(c.created_at).getTime() > Date.now() - 12 * 60_000)
      const match =
        named.find(c => Math.round(Number(c.amount)) === Math.round(amount)) ||
        (recent12.length === 1 ? recent12[0] : null)
      if (match) {
        const cd = (match.custom_data as Record<string, unknown>) || {}
        donorName = String(cd.__name || '').trim() || null
        donorPhone = donorPhone || (match.phone as string) || null
        donorEmail = donorEmail || (match.donor_email as string) || null
      }
    }

    let groupId: string | null = null
    if (groupSlug) {
      const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', groupSlug).maybeSingle()
      groupId = g?.id ?? null
    }

    // A הו"ק may already be recorded from its establishment event (Format B) with a
    // future first-charge date — dedup on the obligation ref so this charge doesn't
    // double it.
    const alreadyHok = obligationRef ? await hokAlreadyRecorded(supabase, campaignId, obligationRef) : false
    const { data: existing } = await supabase.from('donations').select('id').eq('kesher_transaction_id', txn).maybeSingle()
    if (!existing && !alreadyHok && txn) {
      const { data: inserted } = await supabase.from('donations').insert({
        campaign_id: campaignId, org_id: campaign.org_id, amount,
        donor_name: donorName, donor_phone: donorPhone, donor_email: donorEmail, group_id: groupId,
        kesher_transaction_id: txn, kesher_obligation_ref: obligationRef || null, payment_status: 'completed', kesher_raw: body,
      }).select('id').single()
      // Re-attach the custom-form values + pre-step choice from the intent, and send
      // the thank-you email (per-button override → per-form → campaign default).
      if (inserted) {
        const { attachCustomData } = await import('@/lib/donations')
        await attachCustomData(supabase, { donationId: inserted.id, campaignId, phone: donorPhone, amount, donorEmail })
      }
    }
    const { recomputeCampaignRaised } = await import('@/lib/donations')
    await recomputeCampaignRaised(supabase, campaignId)
    return (existing || alreadyHok) ? `duplicate: txn ${txn}${alreadyHok ? ` (obligation ${obligationRef} already recorded)` : ''}` : `recorded: ₪${amount} txn ${txn} (${donorName || '?'}, ${donorPhone || '?'}) -> ${campaignId}`
  }

  // ── Format B: obligation/customer event — record the הו"ק at establishment ──
  // (handles future-dated first charges that never send a Format A on setup day)
  if (body.Customer && body.Obligation) {
    return await recordObligationHok(supabase, body)
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
  if (!webhookAuthorized(req)) {
    console.warn('Kesher webhook: rejected — bad/missing secret')
    return NextResponse.json({ ok: true })
  }
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
  if (!webhookAuthorized(req)) {
    console.warn('Kesher webhook (GET): rejected — bad/missing secret')
    return NextResponse.json({ ok: true })
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body: Record<string, unknown> = {}
  // `key` is our auth secret, not part of the provider's payload — exclude it.
  searchParams.forEach((value, key) => { if (key !== 'key') body[key] = value })
  await logAndHandle(body, ip, 'GET')
  return NextResponse.json({ ok: true })
}
