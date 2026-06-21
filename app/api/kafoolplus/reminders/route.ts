import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Caller schedules a "call back" reminder, or marks one done/dismissed.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  if (!body.lead_id || !body.due_at) return NextResponse.json({ error: 'חסר תאריך תזכורת' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kafoolplus_leads')
    .select('id, org_id, assigned_caller_group_id').eq('id', body.lead_id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })
  const isOwner = kp.role === 'caller' && kp.member?.caller_group_id === lead.assigned_caller_group_id
  if (!(isOwner || kp.role === 'manager')) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const groupId = kp.member?.caller_group_id ?? lead.assigned_caller_group_id
  const { error } = await admin.from('kafoolplus_reminders').insert({
    org_id: lead.org_id, lead_id: lead.id, caller_group_id: groupId,
    due_at: body.due_at, note: String(body.note || '').trim() || null, status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from('kafoolplus_leads').update({ status: 'callback', locked_by: null, locked_at: null }).eq('id', lead.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  if (!body.id || !['done', 'dismissed', 'pending'].includes(body.status)) {
    return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 })
  }
  if (!kp.role) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  const admin = await createServiceClient()
  const { error } = await admin.from('kafoolplus_reminders').update({ status: body.status }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
