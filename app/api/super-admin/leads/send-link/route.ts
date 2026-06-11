import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendYemotSms } from '@/lib/sms/yemot'

/**
 * Sends the fixed Grow payment-page link to a lead by SMS and advances the
 * lead to "awaiting_payment". Used in the simple (fixed-link) billing mode.
 * Body: { leadId }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const link = process.env.NEXT_PUBLIC_GROW_PAYMENT_LINK
  if (!link) return NextResponse.json({ error: 'לינק התשלום (NEXT_PUBLIC_GROW_PAYMENT_LINK) לא מוגדר' }, { status: 400 })

  const { leadId } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'חסר leadId' }, { status: 400 })

  const { data: lead } = await supabase.from('sales_leads').select('*').eq('id', leadId).single()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })
  if (!lead.phone) return NextResponse.json({ error: 'אין מספר טלפון לליד' }, { status: 400 })

  const apiKey = process.env.YEMOT_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'YEMOT_API_KEY לא מוגדר' }, { status: 400 })

  const sms = await sendYemotSms(
    apiKey,
    lead.phone,
    `שלום, לתשלום דמי ההקמה ב-Kafool: ${link}`
  )

  // advance to awaiting payment (unless already converted)
  if (lead.stage !== 'won') {
    await supabase.from('sales_leads').update({ stage: 'awaiting_payment' }).eq('id', leadId)
  }

  if (!sms.success) return NextResponse.json({ error: sms.error || 'שליחת SMS נכשלה' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
