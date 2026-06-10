import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact route error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}
