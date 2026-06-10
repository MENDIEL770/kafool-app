import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { supabase, user: null, error: NextResponse.json({ error: 'אין הרשאה' }, { status: 403 }) }
  return { supabase, user, error: null }
}

export async function GET(_req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const { data, error: dbError } = await supabase
    .from('contact_settings')
    .select('*')
    .limit(1)
    .single()

  if (dbError && dbError.code !== 'PGRST116') return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

export async function PUT(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const body = await req.json() as { id?: string; phone?: string; email?: string; hours?: string }

  if (body.id) {
    const { id, ...rest } = body
    const { data, error: dbError } = await supabase
      .from('contact_settings')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // No existing row — insert
  const { data, error: dbError } = await supabase
    .from('contact_settings')
    .insert({ phone: body.phone ?? '', email: body.email ?? '', hours: body.hours ?? '' })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}
