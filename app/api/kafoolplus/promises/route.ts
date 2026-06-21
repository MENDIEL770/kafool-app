import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Caller records a promise to donate → creates a promise + marks the lead.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  const amount = Number(body.amount) || 0
  if (!body.lead_id || amount <= 0) return NextResponse.json({ error: 'חסר סכום הבטחה' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kafoolplus_leads')
    .select('id, org_id, assigned_caller_group_id').eq('id', body.lead_id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })
  const isOwner = kp.role === 'caller' && kp.member?.caller_group_id === lead.assigned_caller_group_id
  if (!(isOwner || kp.role === 'manager')) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const groupId = kp.member?.caller_group_id ?? lead.assigned_caller_group_id
  const { error } = await admin.from('kafoolplus_promises').insert({
    org_id: lead.org_id, lead_id: lead.id, caller_group_id: groupId,
    amount, status: 'open', due_date: body.due_date || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from('kafoolplus_leads').update({ status: 'promised', locked_by: null, locked_at: null }).eq('id', lead.id)
  return NextResponse.json({ ok: true })
}
