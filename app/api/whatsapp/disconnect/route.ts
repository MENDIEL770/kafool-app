import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { instanceLogout, partnerDeleteInstance, partnerEnabled } from '@/lib/whatsapp-greenapi'

// Disconnect: log the number out, remove the partner instance, clear the config.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })

  try {
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    const green = (org as { whatsapp_config?: { green?: { id?: string; token?: string } } } | null)?.whatsapp_config?.green
    if (green?.id && green?.token) {
      await instanceLogout(green.id, green.token)
      if (partnerEnabled()) await partnerDeleteInstance(green.id)
    }
  } catch { /* ignore */ }

  await supabase.from('organizations').update({ whatsapp_config: null }).eq('id', orgId)
  return NextResponse.json({ ok: true })
}
