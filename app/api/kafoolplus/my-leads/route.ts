import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

const PHONE = (p: unknown) => String(p ?? '').replace(/[^\d+]/g, '')

// A caller adds leads to their OWN group (e.g. imported from phone contacts).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  const groupId = kp.member?.caller_group_id
  if (kp.role !== 'caller' || !groupId) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rows: { full_name?: string; phone?: string }[] = Array.isArray(body.leads) ? body.leads : []
  if (rows.length === 0) return NextResponse.json({ error: 'אין אנשי קשר' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: group } = await admin.from('kafoolplus_caller_groups').select('branch_id, org_id').eq('id', groupId).maybeSingle()
  if (!group) return NextResponse.json({ error: 'דף הקבוצה לא נמצא' }, { status: 404 })

  // dedupe against the caller's existing leads
  const { data: existing } = await admin.from('kafoolplus_leads').select('phone').eq('assigned_caller_group_id', groupId)
  const seen = new Set((existing ?? []).map(l => PHONE(l.phone)).filter(Boolean))

  const toInsert = rows
    .filter(r => (r.full_name && String(r.full_name).trim()) || PHONE(r.phone))
    .map(r => ({ ...r, phone: PHONE(r.phone) }))
    .filter(r => { if (r.phone && seen.has(r.phone)) return false; if (r.phone) seen.add(r.phone); return true })
    .map(r => ({
      org_id: group.org_id, branch_id: group.branch_id, assigned_caller_group_id: groupId,
      full_name: String(r.full_name || '').trim() || null, phone: r.phone || null,
      import_source: 'contacts', status: 'new',
    }))
  if (toInsert.length === 0) return NextResponse.json({ inserted: 0, skipped: rows.length })

  const { error } = await admin.from('kafoolplus_leads').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: toInsert.length, skipped: rows.length - toInsert.length })
}
