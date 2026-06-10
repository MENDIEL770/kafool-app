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
    .from('faq_items')
    .select('*')
    .order('sort_order')

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const body = await req.json() as { question: string; answer: string; sort_order?: number }
  if (!body.question || !body.answer) return NextResponse.json({ error: 'question and answer required' }, { status: 400 })

  const { data, error: dbError } = await supabase
    .from('faq_items')
    .insert({ question: body.question, answer: body.answer, sort_order: body.sort_order ?? 0 })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const body = await req.json() as { id: string; question?: string; answer?: string; sort_order?: number; is_active?: boolean }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { id, ...rest } = body
  const { data, error: dbError } = await supabase
    .from('faq_items')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { supabase, error } = await checkSuperAdmin()
  if (error) return error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbError } = await supabase.from('faq_items').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
