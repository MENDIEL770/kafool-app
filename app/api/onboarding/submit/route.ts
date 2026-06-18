import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Public intake submit — the client fills their details + chooses a password.
 * Gated by a valid intake_token (not a logged-in session). We create the
 * Supabase auth account immediately (password handled by Supabase, never stored
 * by us) and save the details on the lead. The account has NO org/profile yet —
 * dashboard access opens only when the super admin activates it.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const {
    token, firstName, lastName, phone, email, address, companyId, howHeard, orgName,
    password, passwordConfirm,
  } = body

  if (!token) return NextResponse.json({ error: 'קישור לא תקין' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'יש להזין אימייל' }, { status: 400 })
  if (!firstName?.trim()) return NextResponse.json({ error: 'יש להזין שם' }, { status: 400 })
  if (!orgName?.trim()) return NextResponse.json({ error: 'יש להזין שם עמותה/ארגון' }, { status: 400 })
  if (!password || String(password).length < 6) return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
  if (password !== passwordConfirm) return NextResponse.json({ error: 'הסיסמאות אינן תואמות' }, { status: 400 })

  const supabase = await createServiceClient()

  const { data: lead } = await supabase.from('sales_leads').select('*').eq('intake_token', token).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'הקישור פג תוקף או שכבר מולא' }, { status: 404 })
  if (lead.auth_user_id) return NextResponse.json({ error: 'הטופס כבר מולא עבור קישור זה' }, { status: 409 })

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

  // create the account (email confirmed so the client can sign in once activated)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone?.trim() || '' },
  })
  if (createErr || !created?.user) {
    const msg = createErr?.message || ''
    if (msg.includes('already been registered') || msg.includes('already registered')) {
      return NextResponse.json({ error: 'כתובת המייל הזו כבר רשומה במערכת. פנה אלינו.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg || 'יצירת החשבון נכשלה' }, { status: 500 })
  }

  // save details on the lead; clear the token so the link can't be reused
  const { error: updErr } = await supabase.from('sales_leads').update({
    org_name: orgName.trim(),
    contact_name: firstName.trim(),
    contact_last_name: lastName?.trim() || null,
    email: email.trim(),
    phone: phone?.trim() || null,
    address: address?.trim() || null,
    company_id: companyId?.trim() || null,
    how_heard: howHeard?.trim() || null,
    auth_user_id: created.user.id,
    intake_token: null,
    stage: lead.stage === 'new' ? 'proposal' : lead.stage,
  }).eq('id', lead.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
