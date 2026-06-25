import { NextRequest, NextResponse } from 'next/server'
import { sendYemotSms } from '@/lib/sms/yemot'

// TEMPORARY test endpoint — sends one SMS via Yemot using the production key,
// guarded by a random secret. Remove after verifying the sender ID works.
const SECRET = 'kf-sms-test-9x7q2zr'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const to = (req.nextUrl.searchParams.get('to') || '').trim()
  if (!to) return NextResponse.json({ error: 'missing ?to=' }, { status: 400 })
  const key = process.env.YEMOT_API_KEY
  if (!key) return NextResponse.json({ error: 'YEMOT_API_KEY not set' }, { status: 400 })
  const sender = process.env.SMS_SENDER || 'Kafool'
  const msg = req.nextUrl.searchParams.get('msg') || `בדיקת Kafool ✅ אם קיבלת — ה-SMS עובד עם המזהה ${sender}.`
  const res = await sendYemotSms(key, to, msg)
  return NextResponse.json({ to, sender, ...res })
}
