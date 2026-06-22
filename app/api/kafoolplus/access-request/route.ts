import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// A logged-in but unregistered user asks for access. Stored for the super-admin.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'יש להתחבר תחילה' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = await createServiceClient()
  // upsert by pending email so repeated clicks don't duplicate
  const { data: existing } = await admin.from('kafoolplus_access_requests')
    .select('id').ilike('email', user.email).eq('status', 'pending').maybeSingle()
  if (existing) {
    await admin.from('kafoolplus_access_requests').update({ note: String(body.note || '').trim() || null }).eq('id', existing.id)
    return NextResponse.json({ ok: true, already: true })
  }
  const { error } = await admin.from('kafoolplus_access_requests').insert({
    email: user.email,
    full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
    note: String(body.note || '').trim() || null,
    user_id: user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Super-admin: assign a request to a master campaign (as a coordinator) or reject.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (!kp.isSuperAdmin) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })
  const admin = await createServiceClient()

  if (body.action === 'reject') {
    await admin.from('kafoolplus_access_requests').update({ status: 'rejected', handled_at: new Date().toISOString() }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // assign as coordinator: needs a master_campaign_id + branch name
  const masterId = String(body.master_campaign_id || '')
  if (!masterId) return NextResponse.json({ error: 'בחר קמפיין' }, { status: 400 })
  const { data: reqRow } = await admin.from('kafoolplus_access_requests').select('email, full_name').eq('id', body.id).maybeSingle()
  if (!reqRow) return NextResponse.json({ error: 'הפנייה לא נמצאה' }, { status: 404 })
  const { data: master } = await admin.from('kafoolplus_master_campaigns').select('org_id').eq('id', masterId).maybeSingle()
  if (!master) return NextResponse.json({ error: 'הקמפיין לא נמצא' }, { status: 404 })

  const branchName = String(body.branch_name || '').trim() || (reqRow.full_name || reqRow.email)
  const { data: branch, error: bErr } = await admin.from('kafoolplus_branches')
    .insert({ org_id: master.org_id, master_campaign_id: masterId, name: branchName, coordinator_email: reqRow.email })
    .select('id').single()
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
  await admin.from('kafoolplus_members').insert({
    org_id: master.org_id, email: reqRow.email, role: 'coordinator', master_campaign_id: masterId, branch_id: branch.id,
  })
  await admin.from('kafoolplus_access_requests').update({ status: 'assigned', assigned_org_id: master.org_id, handled_at: new Date().toISOString() }).eq('id', body.id)
  return NextResponse.json({ ok: true })
}
