import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Manager toggles "Kafool+ only" for the org (locks coordinators/callers to the
// module — they won't see the regular fundraising pages).
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const admin = await createServiceClient()
  const { error } = await admin.from('organizations')
    .update({ kafoolplus_only: !!body.kafoolplus_only }).eq('id', kp.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
