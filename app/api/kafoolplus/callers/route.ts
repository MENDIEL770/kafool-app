import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext, makeCallerSlug } from '@/lib/kafoolplus'

// Coordinator (own branch) or manager: add / remove a caller (1:1 caller group
// + a pending caller member matched by email).
function canManageBranch(kp: Awaited<ReturnType<typeof getKafoolPlusContext>>, branchId: string) {
  if (kp.role === 'manager') return true
  return kp.role === 'coordinator' && kp.member?.branch_id === branchId
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  const branchId = String(body.branch_id || '')
  const email = String(body.email || '').trim().toLowerCase()
  const displayName = String(body.display_name || '').trim()
  if (!kp.orgId || !branchId || !email || !displayName) {
    return NextResponse.json({ error: 'יש למלא שם טלפן, מייל וסניף' }, { status: 400 })
  }
  if (!canManageBranch(kp, branchId)) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const admin = await createServiceClient()
  const { data: branch } = await admin.from('kafoolplus_branches').select('id, master_campaign_id, org_id').eq('id', branchId).maybeSingle()
  if (!branch) return NextResponse.json({ error: 'הסניף לא נמצא' }, { status: 404 })

  const { data: group, error: gErr } = await admin.from('kafoolplus_caller_groups').insert({
    org_id: branch.org_id, branch_id: branchId, caller_email: email, display_name: displayName,
    public_slug: makeCallerSlug(displayName),
    donation_link: body.donation_link || null,
    personal_goal: Number(body.personal_goal) || 0,
  }).select().single()
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })

  const { error: mErr } = await admin.from('kafoolplus_members').insert({
    org_id: branch.org_id, email, role: 'caller',
    master_campaign_id: branch.master_campaign_id, branch_id: branchId, caller_group_id: group.id,
  })
  if (mErr) {
    await admin.from('kafoolplus_caller_groups').delete().eq('id', group.id)
    const msg = mErr.code === '23505' ? 'הטלפן כבר רשום בקמפיין הזה' : mErr.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ group })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  if (!body.group_id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: group } = await admin.from('kafoolplus_caller_groups').select('id, branch_id').eq('id', body.group_id).maybeSingle()
  if (!group) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  if (!canManageBranch(kp, group.branch_id)) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { error } = await admin.from('kafoolplus_caller_groups').delete().eq('id', body.group_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
