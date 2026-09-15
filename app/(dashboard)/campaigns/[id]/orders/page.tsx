import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export default async function CampaignOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, settings, org_id')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  // A kaparot page can funnel its donations into another campaign + group
  // (settings.kaparot.record_into). When it does, the actual donation rows live
  // on that TARGET campaign inside the dedicated group — so read the redemptions
  // back from there (by group), otherwise this campaign's own orders are empty.
  let readCampaignId = id as string
  let readGroupId: string | null = null
  const recInto = (campaign.settings as { kaparot?: { record_into?: { campaign_slug?: string; group_slug?: string } } } | null)?.kaparot?.record_into
  if (recInto?.campaign_slug && recInto?.group_slug) {
    const { data: tgt } = await supabase.from('campaigns')
      .select('id').eq('slug', recInto.campaign_slug).eq('org_id', campaign.org_id).maybeSingle()
    if (tgt?.id) {
      const { data: grp } = await supabase.from('groups')
        .select('id').eq('campaign_id', tgt.id).eq('slug', recInto.group_slug).maybeSingle()
      if (grp?.id) { readCampaignId = tgt.id as string; readGroupId = grp.id as string }
    }
  }

  // Paid orders — recorded like donations, with the cart + shipping + buyer
  // fields living in custom_data (attached from the checkout intent). receipt_url
  // is a dedicated column (added by migration); the receipt also lives in
  // kesher_raw.receiptLink, so fall back gracefully if the column isn't there yet.
  const base = 'id, amount, donor_name, donor_phone, donor_email, payment_status, created_at, custom_data, kesher_transaction_id, kesher_raw'
  let orders: unknown[] | null = null
  {
    const q = () => {
      let b = supabase.from('donations').select(base + ', receipt_url')
        .eq('campaign_id', readCampaignId).eq('payment_status', 'completed')
      if (readGroupId) b = b.eq('group_id', readGroupId)
      return b.order('created_at', { ascending: false })
    }
    const r = await q()
    if (r.error && /receipt_url/i.test(r.error.message)) {
      let b = supabase.from('donations').select(base)
        .eq('campaign_id', readCampaignId).eq('payment_status', 'completed')
      if (readGroupId) b = b.eq('group_id', readGroupId)
      const r2 = await b.order('created_at', { ascending: false })
      orders = r2.data
    } else {
      orders = r.data
    }
  }

  return <OrdersClient campaign={campaign} orders={(orders || []) as Parameters<typeof OrdersClient>[0]['orders']} />
}
