import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgName, slug, ownerEmail, ownerName, ownerPhone, sendInvite } = await req.json()
  if (!orgName || !slug) return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check slug availability
  const { data: existing } = await adminClient.from('organizations').select('id').eq('slug', slug).single()
  if (existing) return NextResponse.json({ error: 'Slug תפוס' }, { status: 409 })

  // Create org
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({ name: orgName, slug, status: ownerEmail ? 'pending' : 'active' })
    .select()
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  // If owner email provided — invite or create user
  if (ownerEmail) {
    try {
      if (sendInvite) {
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
