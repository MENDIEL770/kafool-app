import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * Super-admin: set (reset) the password of an org's owner account, so the
 * client can log in. Body: { orgId, password }. The email is confirmed too,
 * so the account is immediately usable.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgId, password } = await req.json().catch(() => ({}))
  if (!orgId) return NextResponse.json({ error: 'חסר מזהה ארגון' }, { status: 400 })
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: org } = await admin.from('organizations').select('owner_id').eq('id', orgId).maybeSingle()
  if (!org?.owner_id) {
    return NextResponse.json({ error: 'לארגון אין חשבון בעלים מקושר. צור חשבון דרך "ארגון חדש".' }, { status: 400 })
  }

  const { error } = await admin.auth.admin.updateUserById(org.owner_id, { password: String(password), email_confirm: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
