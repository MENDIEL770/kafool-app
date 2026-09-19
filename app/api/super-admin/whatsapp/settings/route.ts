import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getWhatsappSettings } from '@/lib/whatsapp-settings'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'אין הרשאה' }, { status: 403 }) }
  return { ok: true }
}

export async function GET() {
  const g = await requireSuperAdmin(); if ('error' in g) return g.error
  const svc = await createServiceClient()
  return NextResponse.json(await getWhatsappSettings(svc))
}

export async function POST(req: NextRequest) {
  const g = await requireSuperAdmin(); if ('error' in g) return g.error
  const { daily_rate, idle_delete_days } = await req.json()
  const svc = await createServiceClient()
  const rows = [
    { page: 'whatsapp_settings', key: 'daily_rate', value: String(Math.max(0, Number(daily_rate) || 0)) },
    { page: 'whatsapp_settings', key: 'idle_delete_days', value: String(Math.max(1, Number(idle_delete_days) || 3)) },
  ]
  const { error } = await svc.from('page_content').upsert(rows, { onConflict: 'page,key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(await getWhatsappSettings(svc))
}
