import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

// GET /api/org/slug?slug=xxx — check availability
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.toLowerCase().trim()
  if (!slug) return NextResponse.json({ error: 'חסר slug' }, { status: 400 })
  if (!SLUG_RE.test(slug)) return NextResponse.json({ available: false, reason: 'invalid' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existing } = await adminClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  // Available if no org has this slug, or it's the current org's slug
  const available = !existing || existing.id === profile?.org_id
  return NextResponse.json({ available })
}

// POST /api/org/slug — save new slug
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile?.org_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }

  const { slug } = await req.json()
  const clean = slug?.toLowerCase().trim()
  if (!clean || !SLUG_RE.test(clean)) {
    return NextResponse.json({ error: 'slug לא תקין' }, { status: 400 })
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check availability (exclude self)
  const { data: existing } = await adminClient
    .from('organizations')
    .select('id')
    .eq('slug', clean)
    .single()

  if (existing && existing.id !== profile.org_id) {
    return NextResponse.json({ error: 'הכתובת כבר תפוסה' }, { status: 409 })
  }

  const { error } = await adminClient
    .from('organizations')
    .update({ slug: clean })
    .eq('id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slug: clean })
}
