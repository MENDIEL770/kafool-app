import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { convertLeadToOrg } from '@/lib/leads'

/**
 * Manually convert a lead into an active organization (without payment).
 * Body: { leadId }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { leadId } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'חסר leadId' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
  const result = await convertLeadToOrg(admin, leadId, baseUrl)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, orgId: result.orgId, slug: result.slug, alreadyConverted: result.alreadyConverted })
}
