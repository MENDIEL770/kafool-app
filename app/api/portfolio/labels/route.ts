import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Manage the portfolio label list. Writes run with the service role after
// verifying the caller is a super admin (mirrors /api/portfolio).

async function requireSuperAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'לא מחובר' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return { ok: false, res: NextResponse.json({ error: 'אין הרשאה' }, { status: 403 }) }
  }
  return { ok: true }
}

// Create a label.
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'חסר שם תווית' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('portfolio_labels')
    .insert({ name, sort_order: body.sort_order ?? 0 })
    .select()
    .single()
  if (error) {
    const msg = error.code === '23505' ? 'תווית בשם הזה כבר קיימת' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ label: data })
}

// Rename a label (or change its order).
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })
  if (typeof fields.name === 'string') {
    fields.name = fields.name.trim()
    if (!fields.name) return NextResponse.json({ error: 'שם תווית ריק' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase.from('portfolio_labels').update(fields).eq('id', id)
  if (error) {
    const msg = error.code === '23505' ? 'תווית בשם הזה כבר קיימת' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

// Delete a label.
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const supabase = await createServiceClient()
  const { error } = await supabase.from('portfolio_labels').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
