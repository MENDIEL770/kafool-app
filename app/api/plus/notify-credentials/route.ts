import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPlusEmail } from '@/lib/email'
import { sendYemotSms } from '@/lib/sms/yemot'

export const dynamic = 'force-dynamic'

/**
 * Sent right after a Kafool+ member updates their password: email + SMS with
 * their login details (email + site link). The new password itself is not echoed
 * back — the member just chose it.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { phone } = await req.json().catch(() => ({}))
  const loginUrl = `${req.nextUrl.origin}/kafool-plus-login`
  const email = user.email

  // Email (best-effort — skipped silently if RESEND isn't configured).
  let emailSent = false
  try {
    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#1f2937">
        <h2 style="color:#21376a">פרטי ההתחברות שלך ל-Kafool+</h2>
        <p>הסיסמה שלך עודכנה בהצלחה. אלו פרטי הכניסה שלך:</p>
        <p><b>כתובת:</b> <a href="${loginUrl}">${loginUrl}</a><br/>
           <b>אימייל:</b> ${email}<br/>
           <b>סיסמה:</b> הסיסמה החדשה שבחרת</p>
        <p style="margin-top:18px">
          <a href="${loginUrl}" style="background:#21376a;color:#fff;padding:10px 22px;border-radius:10px;text-decoration:none;font-weight:bold">כניסה למערכת</a>
        </p>
      </div>`
    emailSent = await sendPlusEmail(email, 'פרטי ההתחברות שלך ל-Kafool+', html)
  } catch { /* ignore */ }

  // SMS (best-effort — needs a phone + YEMOT_API_KEY).
  let smsSent = false
  const apiKey = process.env.YEMOT_API_KEY
  const to = String(phone || '').trim()
  if (apiKey && to) {
    const msg = `Kafool+ | הסיסמה עודכנה.\nאימייל: ${email}\nכניסה: ${loginUrl}`
    const r = await sendYemotSms(apiKey, to, msg)
    smsSent = r.success
  }

  return NextResponse.json({ ok: true, emailSent, smsSent })
}
