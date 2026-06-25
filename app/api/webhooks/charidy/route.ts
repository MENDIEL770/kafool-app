import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Charidy donation webhook. Paste this URL into EVERY Charidy campaign page:
 *   https://www.kafool.com/api/webhooks/charidy
 *
 * Goal: prove that the donor a Kafool+ caller phoned actually opened the link and
 * gave. Charidy POSTs one event per donation; we:
 *   1) log the raw payload (webhook_logs, source 'charidy'),
 *   2) record a kp_donations row (idempotent on transaction_id),
 *   3) match it to a called lead by PHONE (the reliable key; fallback name),
 *   4) map team_id_list -> the caller group that actually received the money,
 *   5) fulfill the lead's open promise (if any) and mark the lead 'donated'.
 * Always returns 200 so Charidy doesn't retry endlessly.
 */

// flexible getter — Charidy field names vary; also looks one level into nests
function pick(body: Record<string, unknown>, ...keys: string[]): string {
  const sources: Record<string, unknown>[] = [body]
  for (const nest of ['donor', 'data', 'attributes', 'donation']) {
    const v = body[nest]
    if (v && typeof v === 'object') sources.push(v as Record<string, unknown>)
  }
  for (const k of keys) {
    for (const s of sources) {
      const v = s[k] ?? s[k.toLowerCase()] ?? s[k.toUpperCase()]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
  }
  return ''
}

// first element of team_id_list / team_names (the credited team)
function firstOf(body: Record<string, unknown>, key: string): string {
  const v = body[key]
  if (Array.isArray(v) && v.length) return String(v[0]).trim()
  return ''
}

const normName = (s: string) => (s || '').replace(/משפחת|משפ['׳]|מר |גב['׳] |הרב |ר['׳] /g, '').replace(/[^א-תa-zA-Z0-9]/g, '').toLowerCase()

// "+972 54-434-2919" / "0544342919" -> last 9 local digits ("544342919")
function localDigits(phone: string): string {
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) d = d.slice(3)
  return d.slice(-9)
}

async function handle(body: Record<string, unknown>): Promise<string> {
  const admin = await createServiceClient()

  const amount = Number(pick(body, 'real_payment', 'amount', 'total', 'effective_amount', 'sum', 'donation_amount').replace(/[^\d.]/g, '')) || 0
  const name = pick(body, 'billing_name', 'name', 'display_name', 'donor_name', 'full_name') ||
    [pick(body, 'first_name'), pick(body, 'last_name')].filter(Boolean).join(' ')
  const phone = pick(body, 'phone_number', 'phone', 'donor_phone', 'mobile', 'tel')
  const email = pick(body, 'email', 'donor_email')
  const txnId = pick(body, 'transaction_id', 'transactionId')
  const donationId = pick(body, 'id', 'donation_id', 'donationId')
  const campaignId = pick(body, 'campaign_id', 'campaignId')
  const teamId = firstOf(body, 'team_id_list') || pick(body, 'team_id')
  const teamName = firstOf(body, 'team_names') || pick(body, 'team_name')
  const donatedAt = pick(body, 'date_added', 'created_at') || null
  if (amount <= 0) return 'ignored: no amount'

  // dedupe key — some gateways (check/offline) leave transaction_id empty, so
  // fall back to the Charidy donation id.
  const dedupeKey = txnId || donationId

  // ── idempotency: same donation already recorded? ──
  if (dedupeKey) {
    const { data: existing } = await admin.from('kp_donations').select('id').eq('charidy_transaction_id', dedupeKey).maybeSingle()
    if (existing) return `duplicate: ${dedupeKey}`
  }

  // ── 1) match the called lead by phone (fallback name) ──
  type LeadRow = { id: string; organization_id: string; status: string; full_name: string | null; assigned_caller_group_id: string | null; custom_fields: Record<string, unknown> | null }
  let lead: LeadRow | null = null
  const last9 = localDigits(phone)
  if (last9.length >= 9) {
    const { data } = await admin.from('kp_leads')
      .select('id, organization_id, status, full_name, assigned_caller_group_id, custom_fields')
      .ilike('phone', `%${last9}%`).limit(1)
    lead = (data ?? [])[0] ?? null
  }
  if (!lead && name) {
    const nn = normName(name)
    if (nn.length >= 3) {
      const { data } = await admin.from('kp_leads')
        .select('id, organization_id, status, full_name, assigned_caller_group_id, custom_fields').limit(4000)
      lead = (data ?? []).find((l: LeadRow) => { const ln = normName(l.full_name || ''); return ln.length >= 3 && (ln === nn || ln.includes(nn) || nn.includes(ln)) }) ?? null
    }
  }

  // ── 2) map the Charidy team -> the caller group that received the money ──
  let recipientGroupId: string | null = null
  let teamLink: string | null = null
  if (teamId) {
    const { data: g } = await admin.from('kp_caller_groups')
      .select('id, donation_link, organization_id').eq('charidy_team_id', teamId).limit(1)
    if (g && g[0]) { recipientGroupId = g[0].id; teamLink = g[0].donation_link ?? null }
  }

  // org_id: prefer the lead's; else the matched group's; else cannot scope -> log only
  const orgId = lead?.organization_id ?? null
  const crossGroup = !!(recipientGroupId && lead?.assigned_caller_group_id && recipientGroupId !== lead.assigned_caller_group_id)
    || (!!lead && !recipientGroupId)

  // ── 3) fulfill the lead's most-recent OPEN promise (optional) ──
  let promiseId: string | null = null
  if (lead) {
    const { data: pr } = await admin.from('kp_promises')
      .select('id, amount').eq('lead_id', lead.id).eq('status', 'open').order('created_at', { ascending: false }).limit(1)
    if (pr && pr[0]) {
      promiseId = pr[0].id
      await admin.from('kp_promises').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', pr[0].id)
    }
  }

  // ── 4) record the donation row (best-effort; needs an org to satisfy RLS scope) ──
  if (orgId) {
    await admin.from('kp_donations').insert({
      organization_id: orgId,
      lead_id: lead?.id ?? null,
      recipient_caller_group_id: recipientGroupId,
      promise_id: promiseId,
      donor_name: name || null,
      donor_phone: phone || null,
      donor_email: email || null,
      amount,
      charidy_transaction_id: dedupeKey || null,
      charidy_donation_id: donationId || null,
      charidy_campaign_id: campaignId || null,
      charidy_team_id: teamId || null,
      charidy_team_name: teamName || null,
      charidy_team_link: teamLink,
      cross_group: crossGroup,
      donated_at: donatedAt,
      raw: body,
    })
  }

  // ── 5) mark the lead donated + accumulate totals for quick display ──
  if (lead) {
    const cf = (lead.custom_fields || {}) as Record<string, unknown>
    const prevTotal = Number(cf.charidy_total ?? cf.charidy_amount ?? 0) || 0
    await admin.from('kp_leads').update({
      status: 'donated',
      custom_fields: {
        ...cf,
        charidy_total: prevTotal + amount,
        charidy_amount: amount,            // last donation (back-compat)
        charidy_donation_id: donationId || undefined,
        charidy_team_name: teamName || undefined,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    return `recorded ₪${amount} -> lead ${lead.id} (${lead.full_name})${crossGroup ? ` [cross-group: ${teamName || teamId}]` : ''}${promiseId ? ' [promise fulfilled]' : ''}`
  }

  return `no lead match (name="${name}", phone="${phone || '∅'}", ₪${amount})${recipientGroupId ? ` recipient=${teamName}` : ''}`
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  let parsed: unknown = {}
  try {
    const ct = req.headers.get('content-type') || ''
    const raw = await req.text()
    if (ct.includes('application/json')) parsed = JSON.parse(raw)
    else { try { parsed = JSON.parse(raw) } catch { const o: Record<string, unknown> = {}; new URLSearchParams(raw).forEach((v, k) => { o[k] = v }); parsed = o } }
  } catch { return NextResponse.json({ ok: true }) }

  // Charidy POSTs an ARRAY of donation objects (sometimes one) — normalize.
  const items = (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[]

  let logId: string | null = null
  try {
    const admin = await createServiceClient()
    const { data } = await admin.from('webhook_logs').insert({ source: 'charidy', ip, body: parsed }).select('id').single()
    logId = data?.id ?? null
  } catch (e) { console.error('Charidy webhook log error:', e) }

  const notes: string[] = []
  for (const item of items) {
    try { notes.push(await handle(item)) } catch (err) { notes.push(`error: ${err instanceof Error ? err.message : String(err)}`) }
  }
  const note = notes.join(' | ')
  console.log('Charidy webhook:', note)

  if (logId) { try { const admin = await createServiceClient(); await admin.from('webhook_logs').update({ note }).eq('id', logId) } catch { /* ignore */ } }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-charidy-webhook' })
}
