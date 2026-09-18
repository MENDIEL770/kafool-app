import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { partnerEnabled, partnerCreateInstance } from '@/lib/whatsapp-greenapi'

// Ensure the caller's org has a GreenAPI instance — creating one via the partner
// API when none exists — so the dashboard can render its QR. No GreenAPI signup.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })

  let green: { id?: string; token?: string } | undefined
  try {
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    green = (org as { whatsapp_config?: { green?: { id?: string; token?: string } } } | null)?.whatsapp_config?.green
  } catch { return NextResponse.json({ error: 'הרץ תחילה את המיגרציה whatsapp_config' }, { status: 400 }) }

  if (green?.id && green?.token) return NextResponse.json({ ok: true, hasInstance: true, partner: partnerEnabled() })

  if (!partnerEnabled()) return NextResponse.json({ ok: false, partner: false }, { status: 200 })

  const inst = await partnerCreateInstance()
  if (!inst) return NextResponse.json({ error: 'יצירת החיבור נכשלה (GreenAPI). נסו שוב.' }, { status: 500 })

  const whatsapp_config = { provider: 'green', green: { id: inst.id, token: inst.token } }
  const { error } = await supabase.from('organizations').update({ whatsapp_config }).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, hasInstance: true, partner: true })
}
