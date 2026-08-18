import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import { encryptSecret } from '@/lib/crypto'

export const runtime = 'nodejs'

/**
 * Per-organization Stripe connection. Secret keys are WRITE-ONLY — they're stored
 * on the organizations row and never returned to the client; GET reports only
 * whether they're set. Scoped to the caller's current org (getContext).
 */
export async function GET() {
  const supabase = await createClient()
  const ctx = await getContext(supabase)
  if (!ctx.orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })

  const admin = await createServiceClient()
  const { data } = await admin
    .from('organizations')
    .select('stripe_secret_key, stripe_webhook_secret, stripe_publishable_key')
    .eq('id', ctx.orgId).maybeSingle()

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
  return NextResponse.json({
    connected: !!(data?.stripe_secret_key || '').trim(),
    hasWebhook: !!(data?.stripe_webhook_secret || '').trim(),
    hasPublishable: !!(data?.stripe_publishable_key || '').trim(),
    webhookUrl: `${base}/api/webhooks/stripe`,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getContext(supabase)
  if (!ctx.orgId) return NextResponse.json({ error: 'no org' }, { status: 400 })
  if (ctx.role !== 'admin' && ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const update: Record<string, string | null> = {}

  // Only overwrite a field when a value is provided; '' explicitly clears it.
  if (typeof body.secretKey === 'string') {
    const v = body.secretKey.trim()
    if (v && !/^sk_(test|live)_/.test(v) && !/^rk_(test|live)_/.test(v)) {
      return NextResponse.json({ error: 'מפתח סודי לא תקין (מתחיל ב-sk_)' }, { status: 400 })
    }
    update.stripe_secret_key = v ? encryptSecret(v) : null
  }
  if (typeof body.webhookSecret === 'string') {
    const v = body.webhookSecret.trim()
    if (v && !/^whsec_/.test(v)) {
      return NextResponse.json({ error: 'סוד Webhook לא תקין (מתחיל ב-whsec_)' }, { status: 400 })
    }
    update.stripe_webhook_secret = v ? encryptSecret(v) : null
  }
  // Publishable key is public (used in the browser) — stored as-is, not encrypted.
  if (typeof body.publishableKey === 'string') {
    const v = body.publishableKey.trim()
    if (v && !/^pk_(test|live)_/.test(v)) {
      return NextResponse.json({ error: 'מפתח ציבורי לא תקין (מתחיל ב-pk_)' }, { status: 400 })
    }
    update.stripe_publishable_key = v || null
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true })

  const admin = await createServiceClient()
  const { error } = await admin.from('organizations').update(update).eq('id', ctx.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
