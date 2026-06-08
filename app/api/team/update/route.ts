import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile?.org_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }

  const { userId, role, is_active } = await req.json()
  if (!userId) return NextResponse.json({ error: 'חסר userId' }, { status: 400 })

  // Cannot modify self
  if (userId === user.id) return NextResponse.json({ error: 'לא ניתן לשנות את עצמך' }, { status: 400 })

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify target belongs to same org
  const { data: target } = await adminClient.from('profiles').select('org_id').eq('id', userId).single()
  if (target?.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'משתמש לא שייך לארגון זה' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = is_active

  await adminClient.from('profiles').update(updates).eq('id', userId)

  return NextResponse.json({ ok: true })
}
