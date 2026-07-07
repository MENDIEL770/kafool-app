import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendYemotSmsBulk } from '@/lib/sms/yemot'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Manual SMS blast to an arbitrary list of phone numbers (from the SMS page).
 * Body: { phones: string[], message: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return NextResponse.json({ error: 'אין ארגון משויך' }, { status: 403 })

  // Throttle SMS blasts so a compromised session can't burn the Yemot credit.
  if (!rateLimit(`sms:${user.id}`, 12, 60_000)) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד דקה.' }, { status: 429 })
  }

  const { phones, message } = await req.json()
  if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
    return NextResponse.json({ error: 'חסרים מספרי טלפון או תוכן הודעה' }, { status: 400 })
  }

  const apiKey = process.env.YEMOT_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'YEMOT_API_KEY לא מוגדר' }, { status: 400 })

  // normalize to digits only, dedupe, drop empties
  const clean = Array.from(new Set(
    phones.map((p: string) => String(p).replace(/[^\d]/g, '')).filter((p: string) => p.length >= 9)
  ))
  if (clean.length === 0) return NextResponse.json({ error: 'לא נמצאו מספרים תקינים' }, { status: 400 })

  const result = await sendYemotSmsBulk(apiKey, clean, message.trim())

  // best-effort logging
  try {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await admin.from('sms_logs').insert(
      clean.map(to => ({ org_id: profile.org_id, to_phone: to, message: message.trim(), status: result.success ? 'sent' : 'failed' }))
    )
  } catch { /* logging is non-fatal */ }

  if (!result.success) return NextResponse.json({ error: result.error || 'שליחת ה-SMS נכשלה' }, { status: 502 })
  return NextResponse.json({ ok: true, count: clean.length })
}
