import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DonorsClient from './DonorsClient'

export default async function CampaignDonorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, raised_amount, goal_amount, org_id')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount, donor_name, donor_phone, donor_email, dedication, payment_status, created_at, kesher_transaction_id')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  return <DonorsClient campaign={campaign} donations={donations || []} />
}
