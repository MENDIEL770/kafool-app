import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Manager: add a coordinator (creates a branch + a pending member row matched by
// email) or remove one (delete the branch — cascades its members + groups).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const masterId = String(body.master_campaign_id || '')
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  if (!masterId || !name || !email) {
    return NextResponse.json({ error: 'יש למלא שם סניף, מייל רכז וקמפיין' }, { status: 400 })
  }

  const { data: branch, error: bErr } = await supabase
    .from('kafoolplus_branches')
    .insert({ org_id: kp.orgId, master_campaign_id: masterId, name, coordinator_email: email, goal_amount: Number(body.goal_amount) || 0 })
    .select()
    .single()
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  const { error: mErr } = await supabase
    .from('kafoolplus_members')
    .insert({ org_id: kp.orgId, email, role: 'coordinator', master_campaign_id: masterId, branch_id: branch.id })
  if (mErr) {
    // roll back the branch so we don't leave a coordinator-less branch
    await supabase.from('kafoolplus_branches').delete().eq('id', branch.id)
    const msg = mErr.code === '23505' ? 'הרכז כבר רשום בקמפיין הזה' : mErr.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ branch })
}

// Assign (or change) a coordinator email on an EXISTING branch — used after the
// network import, where branches are created without coordinators.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const branchId = String(body.branch_id || '')
  const email = String(body.email || '').trim().toLowerCase()
  if (!branchId || !email) return NextResponse.json({ error: 'חסר סניף או מייל' }, { status: 400 })

  const { createServiceClient } = await import('@/lib/supabase/server')
  const admin = await createServiceClient()
  const { data: branch } = await admin.from('kafoolplus_branches').select('id, master_campaign_id, org_id').eq('id', branchId).maybeSingle()
  if (!branch) return NextResponse.json({ error: 'הסניף לא נמצא' }, { status: 404 })

  await admin.from('kafoolplus_branches').update({ coordinator_email: email }).eq('id', branchId)

  // upsert a coordinator member row for this branch
  const { data: existing } = await admin.from('kafoolplus_members')
    .select('id').eq('branch_id', branchId).eq('role', 'coordinator').maybeSingle()
  if (existing) {
    await admin.from('kafoolplus_members').update({ email, user_id: null }).eq('id', existing.id)
  } else {
    const { error } = await admin.from('kafoolplus_members').insert({
      org_id: branch.org_id, email, role: 'coordinator',
      master_campaign_id: branch.master_campaign_id, branch_id: branchId,
    })
    if (error) {
      const msg = error.code === '23505' ? 'הרכז כבר רשום בקמפיין הזה' : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  if (!body.branch_id) return NextResponse.json({ error: 'חסר מזהה סניף' }, { status: 400 })
  const { error } = await supabase.from('kafoolplus_branches').delete().eq('id', body.branch_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
