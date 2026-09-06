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
  // fields living in custom_data (attached from the checkout intent).
  const { data: orders } = await supabase
    .from('donations')
    .select('id, amount, donor_name, donor_phone, donor_email, payment_status, created_at, custom_data')
    .eq('campaign_id', id)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })

  return <OrdersClient campaign={campaign} orders={orders || []} />
}
