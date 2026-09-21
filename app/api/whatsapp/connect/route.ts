import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { partnerEnabled, partnerCreateInstance, instanceSetSendOnly } from '@/lib/whatsapp-greenapi'

// Ensure the caller's org has a GreenAPI instance — creating one via the partner
// API when none exists — so the dashboard can render its QR. No GreenAPI signup.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })

  let config: Record<string, unknown> = {}
  try {
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    config = ((org as { whatsapp_config?: Record<string, unknown> } | null)?.whatsapp_config) || {}
  } catch { return NextResponse.json({ error: 'הרץ תחילה את המיגרציה whatsapp_config' }, { status: 400 }) }
  const green = config.green as { id?: string; token?: string } | undefined

  if (green?.id && green?.token) return NextResponse.json({ ok: true, hasInstance: true, partner: partnerEnabled() })

  if (!partnerEnabled()) return NextResponse.json({ ok: false, partner: false }, { status: 200 })

  const inst = await partnerCreateInstance()
  if (!inst) return NextResponse.json({ error: 'יצירת החיבור נכשלה (GreenAPI). נסו שוב.' }, { status: 500 })

  // Harden to send-only immediately (don't receive/expose the customer's chats).
  await instanceSetSendOnly(inst.id, inst.token)

  // Merge — never drop the usage/service ledger already stored.
  const whatsapp_config = { ...config, provider: 'green', green: { id: inst.id, token: inst.token }, connected_at: new Date().toISOString() }
  const { error } = await supabase.from('organizations').update({ whatsapp_config }).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, hasInstance: true, partner: true })
}
