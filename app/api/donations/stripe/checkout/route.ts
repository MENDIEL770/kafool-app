import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripeFromKey, getOrgStripe } from '@/lib/stripe'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * Create a Stripe Checkout Session for a foreign-currency donation, and return
 * its hosted-page URL. The donor is redirected there to pay; Stripe then posts
 * checkout.session.completed to /api/webhooks/stripe, which records the donation.
 * Amount + currency are controlled here (by our system), not by a third party.
 * Uses the campaign's ORGANIZATION Stripe secret key (falls back to the env key).
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`stripe:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'rate' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const campaignId = String(body.campaignId || '')
  const amount = Math.round(Number(body.amount) || 0)
  if (!campaignId || amount <= 0) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data: campaign } = await supabase
    .from('campaigns').select('id, title, slug, settings, org_id').eq('id', campaignId).maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })

  const s = (campaign.settings as { stripe_enabled?: boolean; stripe_currency?: string } | null) || {}
  if (!s.stripe_enabled) return NextResponse.json({ error: 'stripe disabled' }, { status: 400 })
  const currency = String(s.stripe_currency || 'usd').toLowerCase()

  // This org's own Stripe account (falls back to the platform env key).
  const { secretKey } = await getOrgStripe(supabase, campaign.org_id)
  const stripe = stripeFromKey(secretKey)
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
  const name = body.name ? String(body.name).slice(0, 120) : ''
  const phone = body.phone ? String(body.phone).slice(0, 30) : ''
  const email = body.email ? String(body.email).slice(0, 200) : ''
  const groupSlug = body.groupSlug ? String(body.groupSlug).slice(0, 120) : ''

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [{
        price_data: {
          currency,
          unit_amount: amount * 100, // smallest currency unit (cents / agorot)
          product_data: { name: `תרומה — ${campaign.title || ''}`.trim() },
        },
        quantity: 1,
      }],
      ...(email && /.+@.+\..+/.test(email) ? { customer_email: email } : {}),
      metadata: { campaignId, groupSlug, phone, name },
      success_url: `${base}/${campaign.slug}/thanks?tx={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/${campaign.slug}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('stripe checkout error:', e)
    return NextResponse.json({ error: 'checkout failed' }, { status: 500 })
  }
}
