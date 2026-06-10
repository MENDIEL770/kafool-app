import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'חסר orgId' }, { status: 400 })

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find org owner
  const { data: org } = await adminClient
    .from('organizations')
    .select('owner_id, name')
    .eq('id', orgId)
    .single()

  if (!org?.owner_id) return NextResponse.json({ error: 'אין בעלים לארגון זה' }, { status: 404 })

  // Get owner email
  const { data: { user: ownerUser }, error } = await adminClient.auth.admin.getUserById(org.owner_id)
  if (error || !ownerUser?.email) return NextResponse.json({ error: 'לא נמצא מייל של הבעלים' }, { status: 404 })

  // Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerUser.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'}/dashboard`,
    },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  return NextResponse.json({ url: linkData.properties?.action_link, orgName: org.name })
}
