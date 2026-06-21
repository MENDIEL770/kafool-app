import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Coordinator (own branch) or manager: bulk-import leads, assign a lead, or
// auto-split unassigned leads across the branch's callers.
function canManageBranch(kp: Awaited<ReturnType<typeof getKafoolPlusContext>>, branchId: string) {
  if (kp.role === 'manager') return true
  return kp.role === 'coordinator' && kp.member?.branch_id === branchId
}

const PHONE = (p: unknown) => String(p ?? '').replace(/[^\d+]/g, '')

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  const branchId = String(body.branch_id || '')
  const rows: Record<string, unknown>[] = Array.isArray(body.leads) ? body.leads : []
  if (!kp.orgId || !branchId || rows.length === 0) return NextResponse.json({ error: 'אין לידים לייבוא' }, { status: 400 })
  if (!canManageBranch(kp, branchId)) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const admin = await createServiceClient()
  // dedupe against existing phones in the branch
  const { data: existing } = await admin.from('kafoolplus_leads').select('phone').eq('branch_id', branchId)
  const seen = new Set((existing ?? []).map(l => PHONE(l.phone)).filter(Boolean))

  const toInsert: Record<string, unknown>[] = []
  for (const r of rows) {
    const phone = PHONE(r.phone)
    if (phone && seen.has(phone)) continue
    if (phone) seen.add(phone)
    const prev = Number(r.prev_amount) || 0
    toInsert.push({
      org_id: kp.orgId, branch_id: branchId,
      full_name: String(r.full_name || '').trim() || null,
      phone: phone || null,
      email: String(r.email || '').trim() || null,
      address: String(r.address || '').trim() || null,
      notes: String(r.notes || '').trim() || null,
      donation_history: prev > 0 ? [{ year: new Date().getFullYear() - 1, amount: prev }] : [],
      import_source: body.import_source === 'contacts' ? 'contacts' : 'excel',
    })
  }
  if (toInsert.length === 0) return NextResponse.json({ inserted: 0, skipped: rows.length })

  const { error } = await admin.from('kafoolplus_leads').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: toInsert.length, skipped: rows.length - toInsert.length })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const body = await req.json().catch(() => ({}))
  const admin = await createServiceClient()

  // Auto-split unassigned leads evenly across the branch's callers
  if (body.auto && body.branch_id) {
    if (!canManageBranch(kp, String(body.branch_id))) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    const [{ data: groups }, { data: leads }] = await Promise.all([
      admin.from('kafoolplus_caller_groups').select('id').eq('branch_id', body.branch_id),
      admin.from('kafoolplus_leads').select('id').eq('branch_id', body.branch_id).is('assigned_caller_group_id', null),
    ])
    if (!groups?.length) return NextResponse.json({ error: 'אין טלפנים בסניף' }, { status: 400 })
    if (!leads?.length) return NextResponse.json({ assigned: 0 })
    let i = 0
    for (const lead of leads) {
      const gid = groups[i % groups.length].id
      await admin.from('kafoolplus_leads').update({ assigned_caller_group_id: gid }).eq('id', lead.id)
      i++
    }
    return NextResponse.json({ assigned: leads.length })
  }

  // Single assignment
  if (!body.lead_id) return NextResponse.json({ error: 'חסר מזהה ליד' }, { status: 400 })
  const { data: lead } = await admin.from('kafoolplus_leads').select('branch_id').eq('id', body.lead_id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'הליד לא נמצא' }, { status: 404 })
  if (!canManageBranch(kp, lead.branch_id)) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  const { error } = await admin.from('kafoolplus_leads')
    .update({ assigned_caller_group_id: body.caller_group_id || null }).eq('id', body.lead_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
