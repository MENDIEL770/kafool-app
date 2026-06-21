import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Manager: import ONE branch (+ its leads) from the donor-network workbook.
// The client parses the multi-sheet file and posts one branch at a time, so we
// stay under the request-body limit and can show progress.
interface IncomingLead {
  full_name?: string; phone?: string | null; email?: string | null
  donation_history?: { year: number; amount: number }[]
  ambassador_note?: string | null; is_vip?: boolean; needs_review?: boolean
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const masterId = String(body.master_campaign_id || '')
  const name = String(body.name || '').trim()
  const rows: IncomingLead[] = Array.isArray(body.leads) ? body.leads : []
  if (!masterId || !name) return NextResponse.json({ error: 'חסר קמפיין או שם סניף' }, { status: 400 })

  const admin = await createServiceClient()
  const { data: branch, error: bErr } = await admin.from('kafoolplus_branches')
    .insert({ org_id: kp.orgId, master_campaign_id: masterId, name })
    .select('id').single()
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  if (rows.length) {
    const toInsert = rows
      .filter(r => r.full_name && String(r.full_name).trim())
      .map(r => ({
        org_id: kp.orgId, branch_id: branch.id,
        full_name: String(r.full_name).trim(),
        phone: r.phone || null,
        email: r.email || null,
        donation_history: Array.isArray(r.donation_history) ? r.donation_history : [],
        ambassador_note: r.ambassador_note || null,
        is_vip: !!r.is_vip,
        needs_review: !!r.needs_review,
        import_source: 'excel',
      }))
    if (toInsert.length) {
      const { error: lErr } = await admin.from('kafoolplus_leads').insert(toInsert)
      if (lErr) return NextResponse.json({ error: lErr.message, branch_id: branch.id }, { status: 500 })
    }
  }
  return NextResponse.json({ branch_id: branch.id, inserted: rows.length })
}
