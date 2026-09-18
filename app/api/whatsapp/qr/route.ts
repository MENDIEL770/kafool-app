import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { instanceQr } from '@/lib/whatsapp-greenapi'

// Live QR + connection state for the caller's org instance. Polled by the UI.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return NextResponse.json({ state: 'no-org' })

  let green: { id?: string; token?: string } | undefined
  try {
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    green = (org as { whatsapp_config?: { green?: { id?: string; token?: string } } } | null)?.whatsapp_config?.green
  } catch { /* not migrated */ }
  if (!green?.id || !green?.token) return NextResponse.json({ state: 'no-instance' })

  const { state, qr } = await instanceQr(green.id, green.token)
  return NextResponse.json({ state, qr: qr ? `data:image/png;base64,${qr}` : null })
}
