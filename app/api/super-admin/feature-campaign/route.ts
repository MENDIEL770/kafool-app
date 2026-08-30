import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Super-admin only: toggle whether a campaign appears in the home-page showcase.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const show = body.show === true
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const admin = await createServiceClient()
  const { error } = await admin.from('campaigns').update({ show_on_homepage: show }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
