import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { attachCustomData, recomputeCampaignRaised } from '@/lib/donations'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

/**
 * Stripe webhook. Verifies the signature (whsec_… secret) against the RAW body,
 * then on checkout.session.completed records the donation — like the Kesher /
 * Nedarim webhooks. Idempotent by the session id.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return NextResponse.json({ ok: true }) // not configured yet

  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    console.error('stripe signature verification failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ ok: true })

  const session = event.data.object as Stripe.Checkout.Session
  try {
    const supabase = await createServiceClient()
    const campaignId = session.metadata?.campaignId
    if (!campaignId || session.payment_status !== 'paid') return NextResponse.json({ ok: true })

    const { data: campaign } = await supabase
      .from('campaigns').select('org_id, settings').eq('id', campaignId).maybeSingle()
    if (!campaign) return NextResponse.json({ ok: true })

    const txn = String(session.id)
    const { data: existing } = await supabase
      .from('donations').select('id').eq('kesher_transaction_id', txn).maybeSingle()
    if (!existing) {
      const currency = String(session.currency || 'usd').toLowerCase()
      const paid = (Number(session.amount_total) || 0) / 100
      // The campaign total is in ₪ — convert foreign currency at the configured rate.
      const rate = Number((campaign.settings as { stripe_ils_rate?: number } | null)?.stripe_ils_rate) || (currency === 'ils' ? 1 : 3.7)
      const ilsAmount = currency === 'ils' ? Math.round(paid) : Math.round(paid * rate)

      const groupSlug = session.metadata?.groupSlug || ''
      let groupId: string | null = null
      if (groupSlug) {
        const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', campaignId).eq('slug', groupSlug).maybeSingle()
        groupId = g?.id ?? null
      }
      const phone = session.metadata?.phone || session.customer_details?.phone || null
      const email = session.customer_details?.email || session.customer_email || null
      const name = session.metadata?.name || session.customer_details?.name || null

      const { data: inserted } = await supabase.from('donations').insert({
        campaign_id: campaignId,
        org_id: campaign.org_id,
        amount: ilsAmount,
        donor_name: name,
        donor_phone: phone,
        donor_email: email,
        group_id: groupId,
        kesher_transaction_id: txn,
        payment_status: 'completed',
        custom_data: { payment_method: 'stripe', stripe_currency: currency, stripe_amount: paid },
        kesher_raw: session as unknown as Record<string, unknown>,
      }).select('id').single()

      if (inserted) {
        await attachCustomData(supabase, { donationId: inserted.id, campaignId, phone, amount: ilsAmount, donorEmail: email })
      }
    }
    await recomputeCampaignRaised(supabase, campaignId)
  } catch (e) {
    console.error('stripe webhook handling error:', e)
  }
  return NextResponse.json({ ok: true })
}
