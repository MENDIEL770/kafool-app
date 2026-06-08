import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DonationPageClient from './DonationPageClient'

export default async function PublicDonationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Resolve campaign by slug
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!campaign) notFound()

  // Get org for branding
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, status, kesher_page_url, kesher_active, kesher_url_hok, kesher_url_bit, kesher_url_bank')
    .eq('id', campaign.org_id)
    .single()

  if (!org) notFound()

  // Get recent donations (for donor wall)
  const { data: donations } = await supabase
    .from('donations')
    .select('id, donor_name, amount, dedication, created_at')
    .eq('campaign_id', campaign.id)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get groups
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, slug, goal_amount, raised_amount, manager_name')
    .eq('campaign_id', campaign.id)
    .order('raised_amount', { ascending: false })

  // Get gallery
  const { data: gallery } = await supabase
    .from('campaign_gallery')
    .select('id, image_url, caption')
    .eq('campaign_id', campaign.id)
    .order('sort_order')

  const settings = campaign.settings as { donation_page_url?: string }
  const o = org as Record<string, string>
  const paymentUrls = {
    one_time:       settings?.donation_page_url || o.kesher_page_url || '',
    hok:            o.kesher_url_hok  || '',
    bit:            o.kesher_url_bit  || '',
    bank:           o.kesher_url_bank || '',
  }

  return (
    <DonationPageClient
      org={org}
      campaign={campaign}
      donations={donations || []}
      groups={(groups || []) as Parameters<typeof DonationPageClient>[0]['groups']}
      gallery={gallery || []}
      donationUrl={paymentUrls.one_time}
      paymentUrls={paymentUrls}
    />
  )
}
