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
