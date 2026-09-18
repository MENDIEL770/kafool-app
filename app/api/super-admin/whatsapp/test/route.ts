import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText, whatsappProvider } from '@/lib/whatsapp'

// Send a test WhatsApp message to verify the connection. Super-admin only.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const provider = whatsappProvider()
  if (!provider) return NextResponse.json({ error: 'לא הוגדר ספק וואטסאפ. הגדירו את משתני הסביבה תחילה.' }, { status: 400 })

  const { to } = await req.json()
  if (!to) return NextResponse.json({ error: 'חסר מספר טלפון' }, { status: 400 })

  const r = await sendWhatsAppText(String(to), 'בדיקת חיבור וואטסאפ מכפול ✅\nאם קיבלת את ההודעה הזו — החיבור עובד!')
  if (!r.success) return NextResponse.json({ error: r.error || 'השליחה נכשלה' }, { status: 500 })
  return NextResponse.json({ ok: true, provider })
}
