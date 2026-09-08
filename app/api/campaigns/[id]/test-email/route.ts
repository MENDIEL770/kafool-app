import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendThankYouEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Send a test of the thank-you email to an address the manager types in, using
// the (possibly unsaved) subject/body/image from the editor — rendered exactly
// like the real one. Org-scoped.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
  const { data: campaign } = await supabase.from('campaigns').select('title, org_id').eq('id', id).single()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })
  if (profile?.role !== 'super_admin' && profile?.org_id !== campaign.org_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const to = String(body.to || '').trim()
  if (!/.+@.+\..+/.test(to)) return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })

  const tpl = { subject: String(body.subject || ''), body: String(body.body || ''), image: String(body.image || '') }
  const ok = await sendThankYouEmail(to, tpl, campaign.title || '')
  if (!ok) return NextResponse.json({ error: 'שליחת המייל נכשלה — ודא שהמייל מוגדר במערכת (RESEND).' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
