import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGrowPayment } from '@/lib/grow'
import { sendYemotSms } from '@/lib/sms/yemot'

/**
 * Creates a Grow payment process for a lead's setup fee and returns the
 * hosted payment URL (for embedding in an iframe and/or sending by SMS).
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
  if (!lead.setup_fee || Number(lead.setup_fee) <= 0) {
    return NextResponse.json({ error: 'יש להגדיר סכום דמי הקמה לפני יצירת קישור תשלום' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

  const payment = await createGrowPayment({
    ref: lead.id,
    sum: Number(lead.setup_fee),
    description: `דמי הקמה — ${lead.org_name}`,
    fullName: lead.contact_name || lead.org_name,
    phone: lead.phone || undefined,
    email: lead.email || undefined,
    // public landing — the payer may be the client (via SMS), not a logged-in super-admin.
    // The real work (mark paid + convert) happens in the Grow server webhook.
    successUrl: `${baseUrl}/?paid=1`,
    cancelUrl: `${baseUrl}/?cancel=1`,
  })

  if (!payment.ok || !payment.url) {
    return NextResponse.json({ error: payment.error || 'יצירת תשלום נכשלה' }, { status: 502 })
  }

  // Persist process info + advance the lead to "awaiting payment"
  await supabase
    .from('sales_leads')
    .update({
      grow_process_id: payment.processId || null,
      grow_process_token: payment.processToken || null,
      stage: lead.stage === 'won' ? lead.stage : 'awaiting_payment',
    })
    .eq('id', lead.id)

  let smsResult: { success: boolean; error?: string } | null = null
  if (sendSms && lead.phone) {
    const apiKey = process.env.YEMOT_API_KEY
    if (apiKey) {
      smsResult = await sendYemotSms(
        apiKey,
        lead.phone,
        `שלום, לתשלום דמי ההקמה (₪${Number(lead.setup_fee)}) ב-Kafool: ${payment.url}`
      )
    } else {
      smsResult = { success: false, error: 'YEMOT_API_KEY לא מוגדר' }
    }
  }

  return NextResponse.json({ ok: true, url: payment.url, sms: smsResult })
}
