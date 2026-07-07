import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// Keep only known, string-ish fields and cap their length, so a public caller
// can't plant a huge or hostile email payload that we'd later send verbatim.
function sanitizeTemplate(t: unknown): { subject?: string; body?: string; image?: string } | null {
  if (!t || typeof t !== 'object') return null
  const src = t as Record<string, unknown>
  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined)
  const out: { subject?: string; body?: string; image?: string } = {}
  const subject = clip(src.subject, 200)
  const body = clip(src.body, 5000)
  const image = clip(src.image, 1000)
  if (subject) out.subject = subject
  if (body) out.body = body
  if (image) out.image = image
  return out.subject || out.body || out.image ? out : null
}

/**
 * Store the custom-form values a donor filled in our modal, just before they
 * leave for the hosted payment page. The Nedarim/Kesher callback re-attaches
 * them to the recorded donation by matching (campaign_id, phone, amount).
 */
export async function POST(req: NextRequest) {
  // Public endpoint — throttle per IP against floods (donors hit it a handful
  // of times per visit; 40/min is far above legitimate use).
  if (!rateLimit(`intent:${clientIp(req)}`, 40, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const campaignId = String(body.campaignId || '')
  const customData = (body.customData && typeof body.customData === 'object') ? body.customData : {}
  if (!campaignId) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const phone = body.phone ? String(body.phone) : null
  const amount = Number(body.amount) || null
  const groupSlug = body.groupSlug ? String(body.groupSlug) : null
  const donorEmail = body.donorEmail ? String(body.donorEmail) : null
  const emailTemplate = sanitizeTemplate(body.emailTemplate)

  try {
    const supabase = await createServiceClient()
    await supabase.from('donation_intents').insert({
      campaign_id: campaignId,
      group_slug: groupSlug,
      phone,
      amount,
      custom_data: customData,
      donor_email: donorEmail,
      email_template: emailTemplate,
    })
  } catch (e) {
    console.error('donation intent error:', e)
  }
  // best-effort — never block the donor's path to payment
  return NextResponse.json({ ok: true })
}
