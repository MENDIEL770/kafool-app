import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Portfolio writes run with the service role (after verifying the caller is a
// super admin) so they never silently fail on RLS — the browser-client inserts
// were being rejected and swallowed, which looked like "upload does nothing".

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

// Create a new portfolio item (the cover ad).
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  if (!body.image_url) return NextResponse.json({ error: 'חסרה תמונה' }, { status: 400 })

  const insert: Record<string, unknown> = { image_url: body.image_url, sort_order: body.sort_order ?? 0 }
  // Optional: create a full project in one shot (a set of images at once).
  if (Array.isArray(body.project_images)) insert.project_images = body.project_images

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(insert)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// Update an existing item (label, publish flag, order, or full project fields).
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const supabase = await createServiceClient()
  const { error } = await supabase.from('portfolio_items').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Delete an item.
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const supabase = await createServiceClient()
  const { error } = await supabase.from('portfolio_items').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
