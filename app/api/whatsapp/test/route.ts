import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText, whatsappProvider, type WaConfig } from '@/lib/whatsapp'

// Send a WhatsApp test message using the caller's ORG connection (falls back to
// the platform env). Any signed-in manager can test their own org's number.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

  let cfg: WaConfig | null = null
  if (profile?.org_id) {
    try {
      const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', profile.org_id).maybeSingle()
      cfg = ((org as { whatsapp_config?: WaConfig } | null)?.whatsapp_config) || null
    } catch { /* column not migrated → env fallback */ }
  }

  if (!whatsappProvider(cfg)) return NextResponse.json({ error: 'וואטסאפ לא מחובר עדיין. שמרו את פרטי החיבור תחילה.' }, { status: 400 })

  const { to } = await req.json()
  if (!to) return NextResponse.json({ error: 'חסר מספר טלפון' }, { status: 400 })

  const r = await sendWhatsAppText(String(to), 'בדיקת חיבור וואטסאפ מכפול ✅\nאם קיבלת את ההודעה הזו — החיבור עובד!', cfg)
  if (!r.success) return NextResponse.json({ error: r.error || 'השליחה נכשלה' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
