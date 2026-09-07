import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export default async function CampaignOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, settings')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  // Paid orders — recorded like donations, with the cart + shipping + buyer
  // fields living in custom_data (attached from the checkout intent). receipt_url
  // is a dedicated column (added by migration); the receipt also lives in
  // kesher_raw.receiptLink, so fall back gracefully if the column isn't there yet.
  const base = 'id, amount, donor_name, donor_phone, donor_email, payment_status, created_at, custom_data, kesher_transaction_id, kesher_raw'
  let orders: unknown[] | null = null
  {
    const r = await supabase.from('donations').select(base + ', receipt_url')
      .eq('campaign_id', id).eq('payment_status', 'completed').order('created_at', { ascending: false })
    if (r.error && /receipt_url/i.test(r.error.message)) {
      const r2 = await supabase.from('donations').select(base)
        .eq('campaign_id', id).eq('payment_status', 'completed').order('created_at', { ascending: false })
      orders = r2.data
    } else {
      orders = r.data
    }
  }

  return <OrdersClient campaign={campaign} orders={(orders || []) as Parameters<typeof OrdersClient>[0]['orders']} />
}
