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
  const { secretKey, publishableKey } = await getOrgStripe(supabase, campaign.org_id)
  const stripe = stripeFromKey(secretKey)
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  const pk = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  if (!pk) return NextResponse.json({ error: 'חסר מפתח ציבורי של Stripe' }, { status: 400 })

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com').replace(/\/$/, '')
  const name = body.name ? String(body.name).slice(0, 120) : ''
  const phone = body.phone ? String(body.phone).slice(0, 30) : ''
  const email = body.email ? String(body.email).slice(0, 200) : ''
  const groupSlug = body.groupSlug ? String(body.groupSlug).slice(0, 120) : ''
  const recurring = body.recurring === true // monthly standing order (הו"ק)
  const months = Math.round(Number(body.months) || 0) // recurring charge limit (0 = until cancelled)

  const meta: Record<string, string> = { campaignId, groupSlug, phone, name }
  if (recurring && months > 0) meta.installments = String(months)
  const productName = `תרומה — ${campaign.title || ''}`.trim()
  const emailOpt = email && /.+@.+\..+/.test(email) ? { customer_email: email } : {}
  // Embedded Checkout loads inside our page (iframe) and returns to this URL.
  const returnUrl = `${base}/${campaign.slug}/thanks?tx={CHECKOUT_SESSION_ID}`

  try {
    const session = recurring
      ? await stripe.checkout.sessions.create({
          mode: 'subscription',
          ui_mode: 'embedded',
          // A standing order is billed monthly; restrict to card (wallets like
          // Cash App / some methods don't support recurring anyway).
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency,
              unit_amount: amount * 100,
              recurring: { interval: 'month' },
              product_data: { name: `${productName} (הוראת קבע חודשית)` },
            },
            quantity: 1,
          }],
          subscription_data: { metadata: meta }, // so recurring invoices carry it
          ...emailOpt,
          metadata: meta,
          return_url: returnUrl,
        })
      : await stripe.checkout.sessions.create({
          mode: 'payment',
          ui_mode: 'embedded',
          line_items: [{
            price_data: {
              currency,
              unit_amount: amount * 100, // smallest currency unit (cents / agorot)
              product_data: { name: productName },
            },
            quantity: 1,
          }],
          ...emailOpt,
          metadata: meta,
          return_url: returnUrl,
        })
    return NextResponse.json({ clientSecret: session.client_secret, publishableKey: pk })
  } catch (e) {
    console.error('stripe checkout error:', e)
    return NextResponse.json({ error: 'checkout failed' }, { status: 500 })
  }
}
