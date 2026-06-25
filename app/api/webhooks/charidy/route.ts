import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Charidy donation webhook. Paste this URL into the Charidy campaign settings:
 *   https://www.kafool.com/api/webhooks/charidy
 *
 * Charidy POSTs a donation event; we log the raw payload (webhook_logs, source
 * 'charidy') so we can confirm the exact shape, then best-effort reconcile it to
 * a called lead by PHONE (which the public API masks) and mark them donated with
 * the amount. Always returns 200 so Charidy doesn't retry endlessly.
 */

// flexible getter — Charidy field names vary; also looks one level into `donor`/`data`
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

const normName = (s: string) => (s || '').replace(/משפחת|משפ['׳]|מר |גב['׳] |הרב |ר['׳] /g, '').replace(/[^א-תa-zA-Z0-9]/g, '').toLowerCase()

async function handle(body: Record<string, unknown>): Promise<string> {
  const amount = Number(pick(body, 'amount', 'total', 'effective_amount', 'sum', 'donation_amount').replace(/[^\d.]/g, '')) || 0
  const name = pick(body, 'name', 'display_name', 'donor_name', 'full_name') ||
    [pick(body, 'first_name'), pick(body, 'last_name')].filter(Boolean).join(' ')
  const phone = pick(body, 'phone', 'donor_phone', 'mobile', 'tel', 'phone_number')
  const donationId = pick(body, 'id', 'donation_id', 'transaction_id', 'donationId')
  if (amount <= 0) return 'ignored: no amount'

  const admin = await createServiceClient()

  // 1) match by phone (the reliable key — the public API hides it)
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 9) {
    const last9 = digits.slice(-9)
    const { data: leads } = await admin.from('kp_leads')
      .select('id, status, full_name, custom_fields').ilike('phone', `%${last9}%`).limit(5)
    const lead = (leads ?? [])[0]
    if (lead) {
      await admin.from('kp_leads').update({
        status: 'donated',
        custom_fields: { ...(lead.custom_fields as Record<string, unknown> || {}), charidy_amount: amount, charidy_donation_id: donationId || undefined },
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
      return `matched by phone -> lead ${lead.id} (${lead.full_name}) = ₪${amount}`
    }
  }

  // 2) fallback: match by name
  if (name) {
    const nn = normName(name)
    if (nn.length >= 3) {
      const { data: leads } = await admin.from('kp_leads').select('id, status, full_name, custom_fields').limit(2000)
      const lead = (leads ?? []).find(l => { const ln = normName(l.full_name as string); return ln.length >= 3 && (ln === nn || ln.includes(nn) || nn.includes(ln)) })
      if (lead && lead.status !== 'donated') {
        await admin.from('kp_leads').update({
          status: 'donated',
          custom_fields: { ...(lead.custom_fields as Record<string, unknown> || {}), charidy_amount: amount, charidy_donation_id: donationId || undefined },
          updated_at: new Date().toISOString(),
        }).eq('id', lead.id)
        return `matched by name -> lead ${lead.id} (${lead.full_name}) = ₪${amount}`
      }
    }
  }

  return `no lead match (name="${name}", phone="${phone || '∅'}", ₪${amount})`
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

  let logId: string | null = null
  try {
    const admin = await createServiceClient()
    const { data } = await admin.from('webhook_logs').insert({ source: 'charidy', ip, body }).select('id').single()
    logId = data?.id ?? null
  } catch (e) { console.error('Charidy webhook log error:', e) }

  let note = 'error'
  try { note = await handle(body) } catch (err) { note = `error: ${err instanceof Error ? err.message : String(err)}` }

  if (logId) { try { const admin = await createServiceClient(); await admin.from('webhook_logs').update({ note }).eq('id', logId) } catch { /* ignore */ } }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-charidy-webhook' })
}
