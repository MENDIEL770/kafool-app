import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripeFromKey, getOrgStripe } from '@/lib/stripe'
import { attachCustomData, recomputeCampaignRaised } from '@/lib/donations'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

type Meta = { campaignId?: string; groupSlug?: string; phone?: string; name?: string }

// campaignId can live on the session (one-time) or, for a standing order, on the
// invoice's subscription metadata. Read from the UNVERIFIED body only to pick the
// signing secret — trust comes solely from constructEvent passing.
function peekCampaignId(obj: unknown): string | null {
  const o = obj as { metadata?: Meta; subscription_details?: { metadata?: Meta }; parent?: { subscription_details?: { metadata?: Meta } } }
  return (
    o?.metadata?.campaignId ||
    o?.subscription_details?.metadata?.campaignId ||
    o?.parent?.subscription_details?.metadata?.campaignId ||
    null
  )
}

// Record one confirmed donation (idempotent by txnId), convert foreign currency to
// ₪ for the campaign total, then attach custom data + recompute.
async function recordDonation(
  supabase: SupabaseClient,
  args: { campaignId: string; txnId: string; paid: number; currency: string; meta: Meta; email: string | null; phone: string | null; name: string | null; raw: unknown },
): Promise<void> {
  const { data: campaign } = await supabase
    .from('campaigns').select('org_id, settings').eq('id', args.campaignId).maybeSingle()
  if (!campaign) return

  const { data: existing } = await supabase
    .from('donations').select('id').eq('kesher_transaction_id', args.txnId).maybeSingle()
  if (!existing) {
    const rate = Number((campaign.settings as { stripe_ils_rate?: number } | null)?.stripe_ils_rate) || (args.currency === 'ils' ? 1 : 3.7)
    const ilsAmount = args.currency === 'ils' ? Math.round(args.paid) : Math.round(args.paid * rate)

    let groupId: string | null = null
    if (args.meta.groupSlug) {
      const { data: g } = await supabase.from('groups').select('id').eq('campaign_id', args.campaignId).eq('slug', args.meta.groupSlug).maybeSingle()
      groupId = g?.id ?? null
    }

    const { data: inserted } = await supabase.from('donations').insert({
      campaign_id: args.campaignId,
      org_id: campaign.org_id,
      amount: ilsAmount,
      donor_name: args.name,
      donor_phone: args.phone,
      donor_email: args.email,
      group_id: groupId,
      kesher_transaction_id: args.txnId,
      payment_status: 'completed',
      custom_data: { payment_method: 'stripe', stripe_currency: args.currency, stripe_amount: args.paid },
      kesher_raw: args.raw as Record<string, unknown>,
    }).select('id').single()

    if (inserted) {
      await attachCustomData(supabase, { donationId: inserted.id, campaignId: args.campaignId, phone: args.phone, amount: ilsAmount, donorEmail: args.email })
    }
  }
  await recomputeCampaignRaised(supabase, args.campaignId)
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()
  const supabase = await createServiceClient()

  // Untrusted peek → campaign → org, to select the right signing secret.
  let orgId: string | null = null
  try {
    const cid = peekCampaignId(JSON.parse(raw)?.data?.object)
    if (cid) {
      const { data } = await supabase.from('campaigns').select('org_id').eq('id', String(cid)).maybeSingle()
      orgId = (data?.org_id as string) || null
    }
  } catch { /* fall through to env secret */ }

  const org = orgId ? await getOrgStripe(supabase, orgId) : { secretKey: null, webhookSecret: null }
  const webhookSecret = org.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET
  const stripe = stripeFromKey(org.secretKey)
  if (!stripe || !webhookSecret) return NextResponse.json({ ok: true }) // not configured

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
  } catch (e) {
    console.error('stripe signature verification failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  try {
    // One-time donation. Subscriptions (standing orders) are recorded per charge
    // via invoice.paid instead, so skip the subscription's initial session here.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription') return NextResponse.json({ ok: true })
      const campaignId = session.metadata?.campaignId
      if (!campaignId || session.payment_status !== 'paid') return NextResponse.json({ ok: true })
      await recordDonation(supabase, {
        campaignId,
        txnId: String(session.id),
        paid: (Number(session.amount_total) || 0) / 100,
        currency: String(session.currency || 'usd').toLowerCase(),
        meta: (session.metadata as Meta) || {},
        email: session.customer_details?.email || session.customer_email || null,
        phone: session.metadata?.phone || session.customer_details?.phone || null,
        name: session.metadata?.name || session.customer_details?.name || null,
        raw: session,
      })
    }

    // Recurring standing-order charge (first month + every renewal).
    else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as unknown as {
        id: string; amount_paid: number; currency: string; customer_email?: string | null; customer_name?: string | null
        subscription_details?: { metadata?: Meta }; parent?: { subscription_details?: { metadata?: Meta } }
      }
      const meta: Meta = invoice.subscription_details?.metadata || invoice.parent?.subscription_details?.metadata || {}
      const campaignId = meta.campaignId
      if (!campaignId || !(invoice.amount_paid > 0)) return NextResponse.json({ ok: true })
      await recordDonation(supabase, {
        campaignId,
        txnId: String(invoice.id),
        paid: (Number(invoice.amount_paid) || 0) / 100,
        currency: String(invoice.currency || 'usd').toLowerCase(),
        meta,
        email: invoice.customer_email || null,
        phone: meta.phone || null,
        name: meta.name || invoice.customer_name || null,
        raw: invoice,
      })
    }
  } catch (e) {
    console.error('stripe webhook handling error:', e)
  }
  return NextResponse.json({ ok: true })
}
