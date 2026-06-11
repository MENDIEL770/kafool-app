import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgName, contactName, email, phone, setupFee, notes } = await req.json()
  if (!orgName?.trim()) return NextResponse.json({ error: 'שם ארגון הוא חובה' }, { status: 400 })

  const { data, error } = await supabase
    .from('sales_leads')
    .insert({
      org_name: orgName.trim(),
      contact_name: contactName?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      setup_fee: Number(setupFee) || 0,
      notes: notes?.trim() || null,
      source: 'manual',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
