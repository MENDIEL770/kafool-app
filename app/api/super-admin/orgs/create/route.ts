import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { toSlug } from '@/lib/media'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgName, ownerEmail, ownerName, ownerPhone, ownerPassword, sendInvite, hasFundraising, hasKafoolPlus } = await req.json()
  if (!orgName) return NextResponse.json({ error: 'שם ארגון הוא חובה' }, { status: 400 })
  // entitlements: default to fundraising-only; at least one module is required
  const entFundraising = hasFundraising !== false
  const entKafoolPlus = hasKafoolPlus === true
  if (!entFundraising && !entKafoolPlus) {
    return NextResponse.json({ error: 'יש לבחור לפחות מודול אחד (גיוס או Kafool+)' }, { status: 400 })
  }
  if (ownerPassword && String(ownerPassword).length < 6) {
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Auto-generate a unique org slug (the public donation-page slug is chosen
  // later, per campaign). The org slug is just an internal handle.
  const root = toSlug(orgName) || `org-${Math.random().toString(36).slice(2, 8)}`
  let slug = root
  for (let i = 0; i < 25; i++) {
    const { data: taken } = await adminClient.from('organizations').select('id').eq('slug', slug).maybeSingle()
    if (!taken) break
    slug = `${root}-${i + 2}`
  }

  // Create org
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({ name: orgName, slug, status: ownerEmail ? 'pending' : 'active', has_fundraising: entFundraising, has_kafool_plus: entKafoolPlus })
    .select()
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  // If owner email provided — invite or create user
  if (ownerEmail) {
    try {
      if (ownerPassword) {
        // Create a ready-to-use login account with the chosen password.
        const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
          email: ownerEmail,
          password: String(ownerPassword),
          email_confirm: true,
          user_metadata: { org_id: org.id, role: 'admin', full_name: ownerName || '', phone: ownerPhone || '' },
        })
        if (createErr || !created?.user) {
          if (createErr?.message?.includes('registered')) {
            // email already has an account → link it as the owner
            const { data: { users } } = await adminClient.auth.admin.listUsers()
            const target = users.find(u => u.email === ownerEmail)
            if (target) {
              await adminClient.from('profiles').update({ org_id: org.id, role: 'admin', ...(ownerName && { full_name: ownerName }), ...(ownerPhone && { phone: ownerPhone }) }).eq('id', target.id)
              await adminClient.from('organizations').update({ owner_id: target.id, status: 'active' }).eq('id', org.id)
            }
          } else {
            return NextResponse.json({ error: createErr?.message || 'יצירת המשתמש נכשלה' }, { status: 500 })
          }
        } else {
          // ensure the profile is linked (in case the DB trigger didn't map metadata)
          await adminClient.from('profiles').update({ org_id: org.id, role: 'admin', ...(ownerName && { full_name: ownerName }), ...(ownerPhone && { phone: ownerPhone }) }).eq('id', created.user.id)
          await adminClient.from('organizations').update({ owner_id: created.user.id, status: 'active' }).eq('id', org.id)
        }
      } else if (sendInvite) {
        // Send magic invite link via Supabase
        const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(ownerEmail, {
          data: { org_id: org.id, role: 'admin', full_name: ownerName || '', phone: ownerPhone || '' },
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'}/dashboard`,
        })
        if (inviteError && !inviteError.message?.includes('already been registered')) {
          return NextResponse.json({ error: inviteError.message }, { status: 500 })
        }

        // If user already exists, just link them
        if (inviteError?.message?.includes('already been registered')) {
          const { data: { users } } = await adminClient.auth.admin.listUsers()
          const target = users.find(u => u.email === ownerEmail)
          if (target) {
            await adminClient.from('profiles').update({ org_id: org.id, role: 'admin' }).eq('id', target.id)
            await adminClient.from('organizations').update({ owner_id: target.id, status: 'active' }).eq('id', org.id)
          }
        }
      } else {
        // Check if user already exists
        const { data: { users } } = await adminClient.auth.admin.listUsers()
        const target = users.find(u => u.email === ownerEmail)
        if (target) {
          await adminClient.from('profiles').update({
            org_id: org.id,
            role: 'admin',
            ...(ownerName && { full_name: ownerName }),
            ...(ownerPhone && { phone: ownerPhone }),
          }).eq('id', target.id)
          await adminClient.from('organizations').update({ owner_id: target.id, status: 'active' }).eq('id', org.id)
        }
      }
    } catch (e) {
      // Non-fatal — org was created
      console.error('invite error', e)
    }
  }

  return NextResponse.json({ ok: true, orgId: org.id, slug: org.slug })
}
