import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import { encryptSecret } from '@/lib/crypto'

export const runtime = 'nodejs'

/**
 * Per-organization CardCom connection. API name + password are WRITE-ONLY
 * (encrypted, never returned); GET reports only whether they're set. Scoped to
 * the caller's current org.
 */
export async function GET() {
  const supabase = await createClient()
  const ctx = await getContext(supabase)
  if (!ctx.orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })

  const admin = await createServiceClient()
  const { data } = await admin
    .from('organizations')
    .select('cardcom_terminal, cardcom_api_name, cardcom_api_password, cardcom_active')
    .eq('id', ctx.orgId).maybeSingle()

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '').replace('://kafool.com', '://www.kafool.com')
  return NextResponse.json({
    terminal: (data?.cardcom_terminal || '').toString().trim(),
    hasApiName: !!(data?.cardcom_api_name || '').trim(),
    hasApiPassword: !!(data?.cardcom_api_password || '').trim(),
    active: !!data?.cardcom_active,
    webhookUrl: `${base}/api/webhooks/cardcom`,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const ctx = await getContext(supabase)
  if (!ctx.orgId) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, string | boolean | null> = {}

  if (typeof body.terminal === 'string') update.cardcom_terminal = body.terminal.trim() || null
  // API name + password: only overwrite when a value is provided; '' clears.
  if (typeof body.apiName === 'string') { const v = body.apiName.trim(); update.cardcom_api_name = v ? encryptSecret(v) : null }
  if (typeof body.apiPassword === 'string') { const v = body.apiPassword.trim(); update.cardcom_api_password = v ? encryptSecret(v) : null }
  if (typeof body.active === 'boolean') update.cardcom_active = body.active

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true })
  const admin = await createServiceClient()
  const { error } = await admin.from('organizations').update(update).eq('id', ctx.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
