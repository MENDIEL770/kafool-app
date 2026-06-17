import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendYemotSms } from '@/lib/sms/yemot'

// Phone that receives a notification SMS for every new contact-page lead.
const LEADS_NOTIFY_PHONE = process.env.LEADS_NOTIFY_PHONE || '0535035770'

// Build a wa.me link from an Israeli phone (05X… → 9725X…).
function waLink(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const intl = digits.startsWith('972') ? digits : digits.startsWith('0') ? '972' + digits.slice(1) : digits
  return `https://wa.me/${intl}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, phone, email, subject, message, source } = body as {
      full_name?: string
      phone?: string
      email?: string
      subject?: string
      message?: string
      source?: string
    }

    if (!full_name || !message) {
      return NextResponse.json({ error: 'שם מלא והודעה הם שדות חובה' }, { status: 400 })
    }

    // Use service role to bypass RLS for anonymous submissions
    const supabase = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('contact_submissions').insert({
      full_name,
      phone: phone || null,
      email: email || null,
      subject: subject || null,
      message,
      source: source || null,
    })

    if (error) {
      console.error('contact insert error:', error)
      return NextResponse.json({ error: 'שגיאה בשמירת הפנייה' }, { status: 500 })
    }

    // Notify the admin by SMS with the lead details + WhatsApp link.
    // IMPORTANT: await it — un-awaited work gets dropped when the serverless fn returns.
    const apiKey = process.env.YEMOT_API_KEY
    if (apiKey) {
      const wa = waLink(phone)
      const sms = [
        'ליד חדש בכפול',
        `שם: ${full_name}`,
        phone ? `טלפון: ${phone}` : null,
        email ? `מייל: ${email}` : null,
        subject ? `נושא: ${subject}` : null,
        `הודעה: ${message}`,
        wa ? `ווטסאפ: ${wa}` : null,
      ].filter(Boolean).join('\n')
      try {
        const r = await sendYemotSms(apiKey, LEADS_NOTIFY_PHONE, sms)
        if (!r.success) console.error('lead SMS failed:', r.error)
      } catch (e) {
        console.error('lead SMS threw:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact route error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}
