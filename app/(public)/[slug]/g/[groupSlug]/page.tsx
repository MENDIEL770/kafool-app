import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import DonationPageClient from '../../DonationPageClient'

// Cookie-less service-role client so the page can be cached (ISR) under load
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const revalidate = 60 // ISR — cache for 60 seconds

export default async function GroupPage({ params }: { params: Promise<{ slug: string; groupSlug: string }> }) {
  const { slug, groupSlug } = await params
  const supabase = adminClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, status')
    .eq('id', campaign.org_id)
    .single()

  if (!org) notFound()

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('slug', groupSlug)
    .single()

  if (!group) notFound()

  const [
    { data: donations },
    { data: groups },
    { data: gallery },
  ] = await Promise.all([
    supabase
      .from('donations')
      .select('id, donor_name, amount, dedication, created_at')
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

  return (
    <DonationPageClient
      org={org}
      campaign={campaign}
      donations={donations || []}
      groups={(groups || []) as Parameters<typeof DonationPageClient>[0]['groups']}
      gallery={gallery || []}
      activeGroup={{
        id: group.id,
        name: group.name,
        slug: group.slug,
        goal_amount: group.goal_amount,
        raised_amount: group.raised_amount,
        manager_name: group.manager_name,
      }}
    />
  )
}
