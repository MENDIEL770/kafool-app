import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendYemotSms } from '@/lib/sms/yemot'

/**
 * Generates (or reuses) a public intake-form link for a lead so the client can
 * fill in their own details + choose a password. Optionally SMS it to them.
 * Body: { leadId, sendSms?: boolean }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { leadId, sendSms } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'חסר leadId' }, { status: 400 })

  const { data: lead } = await supabase.from('sales_leads').select('*').eq('id', leadId).single()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })

  let token: string = lead.intake_token
  if (!token) {
    token = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 28)
    const { error } = await supabase.from('sales_leads').update({ intake_token: token }).eq('id', leadId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
  const link = `${baseUrl}/join/${token}`

  if (sendSms) {
    const apiKey = process.env.YEMOT_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'YEMOT_API_KEY לא מוגדר' }, { status: 400 })
    if (!lead.phone) return NextResponse.json({ error: 'אין מספר טלפון לליד' }, { status: 400 })
    const sms = await sendYemotSms(apiKey, lead.phone, `שלום, למילוי פרטי פתיחת החשבון ב-Kafool: ${link}`)
    if (!sms.success) return NextResponse.json({ error: sms.error || 'שליחת SMS נכשלה' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, link })
}
