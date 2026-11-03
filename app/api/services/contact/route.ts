import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendYemotSms } from '@/lib/sms/yemot'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// The contact form at the bottom of /services. Saves the request to
// contact_submissions (shows up with the other site leads), SMSes the admin the
// details, and SMSes the person a "we got it" confirmation.

const NOTIFY_PHONE = process.env.LEADS_NOTIFY_PHONE || '0535035770'

// Same normalization the rest of the app uses (lib/donations, lib/abandoned).
const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-9)

export async function POST(request: Request) {
  if (!rateLimit('services-contact:' + clientIp(request), 5, 60_000)) {
    return NextResponse.json({ ok: false, error: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'בקשה לא תקינה' }, { status: 400 }) }

  const name = String(body.name ?? '').trim().slice(0, 120)
  const org = String(body.org ?? '').trim().slice(0, 300)
  const phone = normalizePhone(String(body.phone ?? ''))

  if (!name) return NextResponse.json({ ok: false, error: 'כתבו שם מלא.' }, { status: 400 })
  if (phone.length < 9) return NextResponse.json({ ok: false, error: 'בדקו את מספר הטלפון.' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('services/contact: supabase env missing')
    return NextResponse.json({ ok: false, error: 'השירות אינו זמין כעת.' }, { status: 500 })
  }
  const local = '0' + phone

  const { error } = await createAdmin(url, key).from('contact_submissions').insert({
    full_name: name,
    phone: local,
    subject: 'שירות קמפיין מלא',
    message: org || '—',
    source: 'services',
  })
  if (error) {
    console.error('services/contact insert error:', error)
    return NextResponse.json({ ok: false, error: 'לא הצלחנו לשמור את הפנייה. נסו שוב.' }, { status: 500 })
  }

  // IMPORTANT: await — un-awaited work gets dropped when the serverless fn returns.
  const apiKey = process.env.YEMOT_API_KEY
  if (apiKey) {
    const adminSms = [
      'פנייה חדשה מדף השירות (כפול)',
      'שם: ' + name,
      'טלפון: ' + local,
      org ? 'המוסד והקמפיין: ' + org : null,
      'ווטסאפ: https://wa.me/972' + phone,
    ].filter(Boolean).join('\n')
    const confirmSms = `שלום ${name}, פנייתך לכפול התקבלה. נציג יחזור אליך בהקדם.`
    const [a, c] = await Promise.allSettled([
      sendYemotSms(apiKey, NOTIFY_PHONE, adminSms),
      sendYemotSms(apiKey, local, confirmSms),
    ])
    if (a.status === 'rejected' || !a.value.success) console.error('services/contact admin SMS failed:', a.status === 'rejected' ? a.reason : a.value.error)
    if (c.status === 'rejected' || !c.value.success) console.error('services/contact confirm SMS failed:', c.status === 'rejected' ? c.reason : c.value.error)
  } else {
    console.error('services/contact: YEMOT_API_KEY missing — no SMS sent')
  }

  return NextResponse.json({ ok: true })
}
