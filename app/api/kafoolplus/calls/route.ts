import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

const LEAD_STATUSES = ['no_answer','busy','wrong_number','not_interested','removed','callback','promised','donated']

// Caller logs a call → records it + updates the lead's status.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  if (!body.lead_id) return NextResponse.json({ error: 'חסר מזהה ליד' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kafoolplus_leads')
    .select('id, org_id, assigned_caller_group_id').eq('id', body.lead_id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })

  const isOwner = kp.role === 'caller' && kp.member?.caller_group_id === lead.assigned_caller_group_id
  if (!(isOwner || kp.role === 'manager')) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const groupId = kp.member?.caller_group_id ?? lead.assigned_caller_group_id
  const outcome = String(body.outcome || '')

  await admin.from('kafoolplus_calls').insert({
    org_id: lead.org_id, lead_id: lead.id, caller_group_id: groupId,
    outcome: LEAD_STATUSES.includes(outcome) ? outcome : null,
    notes: String(body.notes || '').trim() || null,
  })

  if (LEAD_STATUSES.includes(outcome)) {
    await admin.from('kafoolplus_leads')
      .update({ status: outcome, locked_by: null, locked_at: null }).eq('id', lead.id)
  }
  return NextResponse.json({ ok: true })
}
