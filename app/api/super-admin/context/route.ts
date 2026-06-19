import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ORG_COOKIE } from '@/lib/tenancy'

/**
 * Set or clear the super-admin's current-org context (sticky cookie).
 * Body: { orgId?: string }  — empty/omitted clears it (back to global overview).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgId } = await req.json().catch(() => ({ orgId: '' }))
  const res = NextResponse.json({ ok: true })

  if (orgId) {
    // verify the org exists before entering it
    const { data: org } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle()
    if (!org) return NextResponse.json({ error: 'הארגון לא נמצא' }, { status: 404 })
    res.cookies.set(ORG_COOKIE, orgId, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  } else {
    res.cookies.set(ORG_COOKIE, '', { path: '/', maxAge: 0 })
  }
  return res
}
