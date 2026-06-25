import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Default password every Kafool+ member starts with (overridable via env).
const DEFAULT_PASSWORD = process.env.KP_DEFAULT_PASSWORD || '0508080770'

/**
 * Lazy account provisioning for Kafool+ members.
 *
 * The login page calls this when signInWithPassword fails. If the email belongs
 * to an active kp_member and no auth account exists yet, we create one with the
 * shared default password — so the member can log in immediately with
 * email + 0508080770, then change it in settings. We NEVER touch an account that
 * already exists (a member who changed their password keeps it).
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))
  const mail = String(email || '').trim().toLowerCase()
  if (!mail) return NextResponse.json({ error: 'חסר מייל' }, { status: 400 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Must be a real, active Kafool+ member.
  const { data: members } = await admin
    .from('kp_members').select('id, role, user_id').ilike('email', mail).eq('is_active', true).limit(1)
  const member = (members ?? [])[0]
  if (!member) return NextResponse.json({ error: 'מייל זה אינו רשום כמשתמש Kafool+' }, { status: 403 })

  // Does an auth account already exist for this email?
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = list?.users.find(u => (u.email || '').toLowerCase() === mail)
  if (existing) {
    // A real email/password is already set → never override it (a member who
    // changed their password keeps it; the client just shows "wrong password").
    const hasPassword = (existing.identities ?? []).some(i => i.provider === 'email')
    if (hasPassword) return NextResponse.json({ exists: true })

    // Account exists but is passwordless (created via Google / admin without a
    // password) → set the shared default so the member can log in & change it.
    if (String(password || '') !== DEFAULT_PASSWORD) {
      return NextResponse.json({ error: `התחבר/י תחילה עם סיסמת ברירת המחדל: ${DEFAULT_PASSWORD}` }, { status: 401 })
    }
    const { error: setErr } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEFAULT_PASSWORD, email_confirm: true,
    })
    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
    if (!member.user_id) await admin.from('kp_members').update({ user_id: existing.id }).eq('id', member.id)
    return NextResponse.json({ created: true })
  }

  // No account yet → only create with the shared default password.
  if (String(password || '') !== DEFAULT_PASSWORD) {
    return NextResponse.json({ error: `התחבר/י תחילה עם סיסמת ברירת המחדל: ${DEFAULT_PASSWORD}` }, { status: 401 })
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email: mail, password: DEFAULT_PASSWORD, email_confirm: true,
    user_metadata: { kafool_plus: true, role: member.role },
  })
  if (error || !created?.user) {
    return NextResponse.json({ error: error?.message || 'יצירת החשבון נכשלה' }, { status: 500 })
  }
  // Link the membership row to the new auth user.
  await admin.from('kp_members').update({ user_id: created.user.id }).eq('id', member.id)
  return NextResponse.json({ created: true })
}
