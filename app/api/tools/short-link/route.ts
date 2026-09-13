import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const randCode = () => Math.random().toString(36).slice(2, 8)
const cleanCode = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 40)

async function orgId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  return p?.org_id || null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const oid = await orgId(supabase)
  if (!oid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  let target = String(body.target_url || '').trim()
  if (!target) return NextResponse.json({ error: 'חסרה כתובת יעד' }, { status: 400 })
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`
  try { new URL(target) } catch { return NextResponse.json({ error: 'כתובת היעד אינה תקינה' }, { status: 400 }) }

  const custom = body.code ? cleanCode(String(body.code)) : ''
  if (body.code && custom.length < 2) return NextResponse.json({ error: 'סיומת קצרה מדי (לפחות 2 תווים)' }, { status: 400 })
  const label = String(body.label || '').trim().slice(0, 80) || null

  // try the custom code once, else generate until free (few attempts)
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = custom && attempt === 0 ? custom : randCode()
    const { data, error } = await supabase.from('short_links')
      .insert({ org_id: oid, code, target_url: target, label })
      .select('id, code, target_url, label, clicks, created_at').single()
    if (!error && data) return NextResponse.json({ link: data })
    // 23505 = unique violation
    if (error && (error.code === '23505' || /duplicate|unique/i.test(error.message))) {
      if (custom && attempt === 0) return NextResponse.json({ error: 'הסיומת הזו כבר תפוסה — בחר אחרת' }, { status: 409 })
      continue
    }
    if (error) return NextResponse.json({ error: 'יצירת הקישור נכשלה' }, { status: 500 })
  }
  return NextResponse.json({ error: 'לא הצלחנו ליצור קוד פנוי — נסה שוב' }, { status: 500 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const oid = await orgId(supabase)
  if (!oid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const { error } = await supabase.from('short_links').delete().eq('id', id)   // RLS scopes to the org
  if (error) return NextResponse.json({ error: 'המחיקה נכשלה' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
