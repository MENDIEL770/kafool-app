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

  // receipt_url is a dedicated column (added by migration); the receipt also lives
  // in kesher_raw.receiptLink, so fall back gracefully if the column isn't there yet.
  const donBase = 'id, amount, donor_name, donor_phone, donor_email, dedication, payment_status, created_at, kesher_transaction_id, group_id, payment_type, installments, monthly_amount, custom_data, kesher_raw'
  let donations: unknown[] | null = null
  {
    const r = await supabase.from('donations').select(donBase + ', receipt_url')
      .eq('campaign_id', id).order('created_at', { ascending: false })
    if (r.error && /receipt_url/i.test(r.error.message)) {
      const r2 = await supabase.from('donations').select(donBase)
        .eq('campaign_id', id).order('created_at', { ascending: false })
      donations = r2.data
    } else {
      donations = r.data
    }
  }

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('campaign_id', id)
    .order('created_at')

  // Org payment provider — distinguishes Kesher vs Nedarim as the donation source.
  const { data: org } = await supabase
    .from('organizations')
    .select('payment_provider')
    .eq('id', campaign.org_id)
    .maybeSingle()

  return <DonorsClient campaign={campaign} donations={(donations || []) as Parameters<typeof DonorsClient>[0]['donations']} groups={groups || []} plans={plans} paymentProvider={(org?.payment_provider as string) || 'kesher'} />
}
