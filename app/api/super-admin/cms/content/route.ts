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

export async function GET(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const page = req.nextUrl.searchParams.get('page')
  if (!page) return NextResponse.json({ error: 'page param required' }, { status: 400 })

  const { data, error: dbError } = await supabase
    .from('page_content')
    .select('*')
    .eq('page', page)
    .order('sort_order')

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const rows = await req.json() as { page: string; key: string; value: string }[]
  if (!Array.isArray(rows)) return NextResponse.json({ error: 'body must be array' }, { status: 400 })

  const { error: dbError } = await supabase
    .from('page_content')
    .upsert(
      rows.map((r) => ({ page: r.page, key: r.key, value: r.value, updated_at: new Date().toISOString() })),
      { onConflict: 'page,key' }
    )

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
