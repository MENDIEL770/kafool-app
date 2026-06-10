import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, phone, email, subject, message } = body as {
      full_name?: string
      phone?: string
      email?: string
      subject?: string
      message?: string
    }

    if (!full_name || !message) {
      return NextResponse.json({ error: 'שם מלא והודעה הם שדות חובה' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('contact_submissions').insert({
      full_name,
      phone: phone || null,
      email: email || null,
      subject: subject || null,
      message,
    })

    if (error) {
      console.error('contact insert error:', error)
      return NextResponse.json({ error: 'שגיאה בשמירת הפנייה' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact route error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}
