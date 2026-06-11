import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import DonationPageClient from './DonationPageClient'

// Service-role client for public reads that bypass RLS
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title, raised_amount, goal_amount, settings, org_id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!campaign) return { title: 'Kafool' }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', campaign.org_id)
    .single()

  const title = `${campaign.title} | ${org?.name ?? 'Kafool'}`
  const tagline = (campaign.settings as { tagline?: string } | null)?.tagline
  const description = tagline
    || `תרמו לקמפיין "${campaign.title}" — ₪${(campaign.raised_amount || 0).toLocaleString()} גויסו עד כה`
  const ogImageUrl = `${BASE_URL}/${slug}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${slug}`,
      siteName: 'Kafool',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: campaign.title }],
      locale: 'he_IL',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export const revalidate = 60 // ISR — cache for 60 seconds

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

  // Parallel fetch — all queries run simultaneously
  const [orgRes, donationsRes, groupsRes, galleryRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, logo_url, status, kesher_page_url, kesher_active, kesher_url_hok, kesher_url_bit, kesher_url_bank')
      .eq('id', campaign.org_id)
      .single(),
    supabase
      .from('donations')
      .select('id, donor_name, amount, dedication, created_at, group_id')
      .eq('campaign_id', campaign.id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('groups')
      .select('id, name, slug, goal_amount, raised_amount, manager_name')
      .eq('campaign_id', campaign.id)
      .order('raised_amount', { ascending: false }),
    supabase
      .from('campaign_gallery')
      .select('id, image_url, caption')
      .eq('campaign_id', campaign.id)
      .order('sort_order'),
  ])

  const org      = orgRes.data
  if (!org) notFound()
  const donations = donationsRes.data
  const groups   = groupsRes.data
  const gallery  = galleryRes.data

  const o = org as Record<string, string>
  const paymentUrls = {
    one_time: o.kesher_page_url || '',
    hok:      o.kesher_url_hok  || '',
    bit:      o.kesher_url_bit  || '',
    bank:     o.kesher_url_bank || '',
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
