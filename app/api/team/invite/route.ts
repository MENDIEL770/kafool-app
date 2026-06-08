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

  const { email, role = 'admin' } = await req.json()
  if (!email) return NextResponse.json({ error: 'חסר אימייל' }, { status: 400 })

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if user already exists in this org
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id, org_id')
    .eq('id', (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id ?? '')
    .single()

  if (existing?.org_id === profile.org_id) {
    return NextResponse.json({ error: 'משתמש זה כבר חבר בארגון' }, { status: 409 })
  }

  // Send invite — Supabase will email the user a magic link
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      org_id: profile.org_id,
      role,
      invited_by: user.id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'}/dashboard`,
  })

  if (error) {
    // If user already exists, just update their profile
    if (error.message?.includes('already been registered')) {
      const { data: { users } } = await adminClient.auth.admin.listUsers()
      const target = users.find(u => u.email === email)
      if (target) {
        await adminClient.from('profiles').update({ org_id: profile.org_id, role }).eq('id', target.id)
        return NextResponse.json({ ok: true, method: 'updated' })
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, method: 'invited' })
}
