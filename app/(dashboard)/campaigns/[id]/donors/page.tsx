import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DonorsClient from './DonorsClient'

export default async function CampaignDonorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, raised_amount, goal_amount, org_id, settings')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  // Donation button plans configured for this campaign (fallback to plain amounts)
  const settings = (campaign.settings || {}) as {
    donation_plans?: { amount: number; label?: string | null }[]
    donation_amounts?: number[]
  }
  const plans = settings.donation_plans?.length
    ? settings.donation_plans.filter(p => p.amount > 0).map(p => ({ amount: p.amount, label: p.label ?? null }))
    : (settings.donation_amounts || []).map(amount => ({ amount, label: null }))

  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount, donor_name, donor_phone, donor_email, dedication, payment_status, created_at, kesher_transaction_id, group_id, payment_type, installments, monthly_amount')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('campaign_id', id)
    .order('created_at')

  return <DonorsClient campaign={campaign} donations={donations || []} groups={groups || []} plans={plans} />
}
