import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Permanently delete an organization and everything under it. Every child table
// (campaigns, groups, donations, dedications, gallery, sms/automation, short
// links, kafool+ …) references organizations(id) ON DELETE CASCADE, and
// profiles.org_id is ON DELETE SET NULL — so removing the org row cascades the
// whole tenant and just unlinks its members. Super-admin only, and the caller
// must echo the org's exact name as a safety confirmation.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgId, confirmName } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'חסר orgId' }, { status: 400 })

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()
  if (!org) return NextResponse.json({ error: 'הארגון לא נמצא' }, { status: 404 })

  // Safety: the typed confirmation must match the org name exactly.
  if ((confirmName || '').trim() !== org.name.trim()) {
    return NextResponse.json({ error: 'שם האישור אינו תואם לשם הארגון' }, { status: 400 })
  }

  // donation_intents has no FK to campaigns (transient matching rows) — clear the
  // org's intents explicitly so nothing is orphaned, then delete the org (cascade).
  const { data: cams } = await adminClient.from('campaigns').select('id').eq('org_id', orgId)
  const camIds = (cams ?? []).map(c => c.id)
  if (camIds.length) await adminClient.from('donation_intents').delete().in('campaign_id', camIds)

  const { error } = await adminClient.from('organizations').delete().eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, name: org.name })
}
