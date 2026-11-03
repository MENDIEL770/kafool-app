import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { sendYemotSms } from '@/lib/sms/yemot'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { QS, type Answers } from '@/lib/services/readiness'
import { buildReport } from '@/lib/services/report'

// Leads from the campaign-readiness questionnaire (/services). The score/range
// are ALWAYS recomputed here on the server — never trusted from the browser.
// The report SMS carries a hard-to-guess link to /report/<token>.

const NOTIFY_PHONE = process.env.LEADS_NOTIFY_PHONE || '0535035770'
const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')

// Same normalization the rest of the app uses (lib/donations, lib/abandoned).
const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-9)
// A normalized 9-digit mobile → a sendable 0-prefixed number.
const sendable = (norm: string) => (norm.length === 9 ? '0' + norm : norm)

// Keep only answers for real questions, with an in-range integer index. This is
// the server-side input validation — anything else is dropped.
function sanitizeAnswers(input: unknown): Answers {
  const out: Answers = {}
  if (!input || typeof input !== 'object') return out
  for (const q of QS) {
    const v = (input as Record<string, unknown>)[q.id]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v
  }
  return out
}

export async function POST(request: Request) {
  if (!rateLimit('services-lead:' + clientIp(request), 8, 60_000)) {
    return NextResponse.json({ ok: false, error: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'בקשה לא תקינה' }, { status: 400 }) }

  const name = String(body.name ?? '').trim().slice(0, 120)
  const phoneRaw = String(body.phone ?? '').trim()
  const org = String(body.org ?? '').trim().slice(0, 160)
  const source = String(body.source ?? 'services').slice(0, 40)
  const retryToken = typeof body.token === 'string' ? body.token : null
  const phone = normalizePhone(phoneRaw)
  const answers = sanitizeAnswers(body.answers)

  if (!name) return NextResponse.json({ ok: false, error: 'חסר שם מלא.' }, { status: 400 })
  if (phone.length < 9) return NextResponse.json({ ok: false, error: 'מספר הטלפון אינו תקין.' }, { status: 400 })
  if (!org) return NextResponse.json({ ok: false, error: 'חסר שם המוסד.' }, { status: 400 })
  if (Object.keys(answers).length === 0) return NextResponse.json({ ok: false, error: 'חסרות תשובות לשאלון.' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('services/lead: supabase env missing')
    return NextResponse.json({ ok: false, error: 'השירות אינו זמין כעת.' }, { status: 500 })
  }
  const supabase = createAdmin(url, key)

  // Build the stable report snapshot from the server-computed answers.
  const report = buildReport(answers, { name, phone: phoneRaw, org })

  // Reuse the lead on a retry (so a failed SMS doesn't create a second row);
  // otherwise create a fresh one.
  let leadId: string | null = null
  let token = retryToken
  let alreadySent = false
  let isNew = false

  if (retryToken) {
    const { data } = await supabase.from('campaign_leads').select('id, token, sms_sent_at').eq('token', retryToken).maybeSingle()
    if (data) { leadId = data.id; token = data.token; alreadySent = !!data.sms_sent_at }
  }

  if (!leadId) {
    token = randomUUID().replace(/-/g, '')
    const { data, error } = await supabase.from('campaign_leads').insert({
      token, name, phone, org, answers, source,
      score: report.raw.score, profile: report.profile,
      range_low: Math.round(report.raw.low), range_high: Math.round(report.raw.high),
      potential: Math.round(report.raw.potential), goal: report.raw.goal, report,
    }).select('id').single()
    if (error || !data) {
      console.error('services/lead insert error:', error)
      return NextResponse.json({ ok: false, error: 'שגיאה בשמירת הבדיקה.' }, { status: 500 })
    }
    leadId = data.id
    isNew = true
  }

  const reportUrl = `${BASE}/report/${token}`

  // Notify Mendi on every NEW lead (once — retries don't re-notify).
  if (isNew && process.env.YEMOT_API_KEY) {
    const adminSms = [
      '🆕 ליד חדש — בדיקת מוכנות',
      `שם: ${name}`,
      `טלפון: ${phoneRaw}`,
      `מוסד: ${org}`,
      `ציון: ${report.score}/100 (${report.pTitle})`,
      `טווח: ${report.low} עד ${report.high}`,
      `דוח: ${reportUrl}`,
    ].join('\n')
    try {
      const r = await sendYemotSms(process.env.YEMOT_API_KEY, NOTIFY_PHONE, adminSms)
      if (!r.success) console.error('services/lead admin SMS failed:', r.error)
    } catch (e) { console.error('services/lead admin SMS threw:', e) }
  }

  // Already sent on a previous attempt — treat as success, don't double-send.
  if (alreadySent) return NextResponse.json({ ok: true, token })

  // Send the report link to the donor. Only on real success do we confirm.
  if (!process.env.YEMOT_API_KEY) {
    return NextResponse.json({ ok: false, token, error: 'שליחת ה-SMS אינה מוגדרת כעת. נסו שוב מאוחר יותר.' }, { status: 502 })
  }
  const donorSms = [
    `שלום${name ? ' ' + name.split(' ')[0] : ''}, הנה דוח המוכנות לקמפיין של ${org}:`,
    reportUrl,
    `ציון מוכנות: ${report.score}/100.`,
    'כפול — שירות קמפיין מלא.',
  ].join('\n')
  let sms
  try {
    sms = await sendYemotSms(process.env.YEMOT_API_KEY, sendable(phone), donorSms)
  } catch (e) {
    console.error('services/lead donor SMS threw:', e)
    return NextResponse.json({ ok: false, token, error: 'שליחת ה-SMS נכשלה. נסו שוב.' }, { status: 502 })
  }
  if (!sms.success) {
    console.error('services/lead donor SMS failed:', sms.error)
    return NextResponse.json({ ok: false, token, error: 'שליחת ה-SMS נכשלה. בדקו את מספר הטלפון ונסו שוב.' }, { status: 502 })
  }

  await supabase.from('campaign_leads').update({ sms_sent_at: new Date().toISOString() }).eq('id', leadId)
  return NextResponse.json({ ok: true, token })
}
