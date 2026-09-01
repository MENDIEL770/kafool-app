import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const BASE = 'https://www.call2all.co.il/ym/api'

// Super-admin diagnostic: sends a test SMS through Yemot with the PRODUCTION env,
// and returns the raw Yemot response + which sender was actually used — so we can
// tell "SMS_SENDER missing in Vercel" from "operator blocks the textual sender".
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const phone = String(body.phone || '').replace(/[\s-]/g, '')
  if (!phone) return NextResponse.json({ error: 'missing phone' }, { status: 400 })

  const apiKey = process.env.YEMOT_API_KEY || ''
  const from = (process.env.SMS_SENDER || '').trim()
  const message = `בדיקת שולח ${from || '(ברירת מחדל)'} — הודעת בדיקה ממערכת כפול`

  const url = new URL(`${BASE}/SendSms`)
  url.searchParams.set('phones', phone)
  url.searchParams.set('message', message)
  if (from) url.searchParams.set('from', from)

  let yemot: unknown = null
  try {
    const res = await fetch(url, { headers: { authorization: apiKey }, signal: AbortSignal.timeout(15000) })
    yemot = await res.json().catch(() => ({ httpStatus: res.status }))
  } catch (e) {
    yemot = { error: String(e) }
  }

  return NextResponse.json({
    hasApiKey: !!apiKey,
    smsSender: from || '(לא מוגדר ב-Vercel)',
    fromSent: from || null,
    yemot,
  })
}
