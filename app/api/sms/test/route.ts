import { NextRequest, NextResponse } from 'next/server'
import { sendYemotSms, getYemotSmsLog, testYemotApiKey } from '@/lib/sms/yemot'

// TEMPORARY diagnostic endpoint — remove once SMS delivery is confirmed.
// Guarded by a random secret. Actions:
//   ?action=session            → account status (units/name) — proves the key works
//   ?action=log                → recent outgoing SMS with per-message status
//   ?action=send&to=05..&from= → send one SMS. from omitted → account default;
//                                from=none → force NO sender; from=Kafool → textual
const SECRET = 'kf-sms-test-9x7q2zr'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const key = process.env.YEMOT_API_KEY
  if (!key) return NextResponse.json({ error: 'YEMOT_API_KEY not set' }, { status: 400 })

  const action = req.nextUrl.searchParams.get('action') || 'send'

  if (action === 'session') {
    const s = await testYemotApiKey(key)
    return NextResponse.json({ action, env_SMS_SENDER: process.env.SMS_SENDER ?? null, ...s })
  }

  if (action === 'log') {
    try {
      const records = await getYemotSmsLog(key, { limit: 15 })
      return NextResponse.json({ action, count: records.length, records })
    } catch (e) {
      return NextResponse.json({ action, error: String(e) }, { status: 500 })
    }
  }

  // action=send
  const to = (req.nextUrl.searchParams.get('to') || '').trim()
  if (!to) return NextResponse.json({ error: 'missing ?to=' }, { status: 400 })
  // from override: absent → use env default; 'none' → omit; otherwise literal
  const fromParam = req.nextUrl.searchParams.get('from')
  const fromOverride = fromParam === null ? undefined : (fromParam === 'none' ? '' : fromParam)
  const msg = req.nextUrl.searchParams.get('msg') || `בדיקת Kafool ✅ ${Date.now()}`
  const res = await sendYemotSms(key, to, msg, fromOverride)
  return NextResponse.json({ action, to, env_SMS_SENDER: process.env.SMS_SENDER ?? null, ...res })
}
