import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendYemotSms, sendYemotSmsBulk } from '@/lib/sms/yemot'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupIds, message } = await req.json()
  if (!groupIds?.length || !message) return NextResponse.json({ error: 'חסר מידע' }, { status: 400 })

  const apiKey = process.env.SMS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'SMS לא מוגדר' }, { status: 500 })

  // Fetch groups and verify they belong to current user's org
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, manager_phone, manager_name')
    .in('id', groupIds)
    .eq('org_id', profile!.org_id)

  if (!groups?.length) return NextResponse.json({ error: 'לא נמצאו קבוצות' }, { status: 404 })

  const results: { name: string; phone: string; ok: boolean; error?: string }[] = []

  for (const g of groups) {
    if (!g.manager_phone) {
      results.push({ name: g.name, phone: '', ok: false, error: 'אין טלפון' })
      continue
    }
    const result = await sendYemotSms(apiKey, g.manager_phone, message)
    results.push({ name: g.name, phone: g.manager_phone, ok: result.success, error: result.error })
  }

  const sent = results.filter(r => r.ok).length
  return NextResponse.json({ ok: true, sent, total: results.length, results })
}
