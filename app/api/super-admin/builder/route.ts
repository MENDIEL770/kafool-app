import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { resolveBuilderConfig } from '@/lib/builder-config'

/**
 * Super-admin: persist a campaign's page-builder config into
 * campaigns.settings.builder (merged, preserving the rest of settings), and
 * revalidate the public donation page so the change shows immediately.
 * Body: { campaignId, config: { blocks, design } }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const { campaignId, config } = await req.json().catch(() => ({}))
  if (!campaignId) return NextResponse.json({ error: 'חסר מזהה קמפיין' }, { status: 400 })

  const clean = resolveBuilderConfig(config)
  if (!clean) return NextResponse.json({ error: 'קונפיג לא תקין' }, { status: 400 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await admin.from('campaigns').select('settings, slug').eq('id', campaignId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'הקמפיין לא נמצא' }, { status: 404 })

  const { error } = await admin
    .from('campaigns')
    .update({ settings: { ...(existing.settings || {}), builder: clean } })
    .eq('id', campaignId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existing.slug) revalidatePath(`/${existing.slug}`)
  return NextResponse.json({ ok: true })
}
