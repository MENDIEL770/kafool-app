import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Manager: create a master campaign. Uses the user client so RLS scopes the
// write (super-admin allowed anywhere, org manager only in their org).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' || !kp.orgId) {
    return NextResponse.json({ error: 'אין הרשאה (נדרש מנהל + ארגון בהקשר)' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'חסר שם קמפיין' }, { status: 400 })

  const { data, error } = await supabase
    .from('kafoolplus_master_campaigns')
    .insert({
      org_id: kp.orgId,
      name,
      goal_amount: Number(body.goal_amount) || 0,
      is_standalone: !!body.is_standalone,
      linked_campaign_id: body.linked_campaign_id || null,
      created_by: user?.id ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
