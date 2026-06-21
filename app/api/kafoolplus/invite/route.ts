import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getKafoolPlusContext } from '@/lib/kafoolplus'

// Generate a passwordless login link for a Kafool+ member (coordinator/caller).
// Creates the auth account + a profile if needed, links the member row, and
// returns a magic link the manager/coordinator can send (WhatsApp/email).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role !== 'manager' && kp.role !== 'coordinator') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim() || email
  if (!email || !kp.orgId) return NextResponse.json({ error: 'חסר מייל' }, { status: 400 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // find or create the auth user
  let userId: string | null = null
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, email_confirm: true, password: crypto.randomUUID(),
  })
  if (created?.user) {
    userId = created.user.id
  } else if (cErr) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    userId = list?.users.find(u => (u.email || '').toLowerCase() === email)?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'יצירת המשתמש נכשלה' }, { status: 500 })

  // ensure a profile exists so the dashboard layout lets them in
  await admin.from('profiles').upsert(
    { id: userId, full_name: name, role: 'caller', org_id: kp.orgId },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  // link the pending member row(s) for this email in the org
  await admin.from('kafoolplus_members').update({ user_id: userId }).ilike('email', email).eq('org_id', kp.orgId)

  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'}/kafool-plus` },
  })
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  return NextResponse.json({ url: link.properties?.action_link })
}
