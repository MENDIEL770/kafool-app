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

export async function PUT(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const body = await req.json() as { id: string; is_read: boolean }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error: dbError } = await supabase
    .from('contact_submissions')
    .update({ is_read: body.is_read })
    .eq('id', body.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}
