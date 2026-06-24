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

// Route params can arrive percent-encoded (Hebrew slugs), so decode defensively
// before matching them against the stored slug.
function dec(s: string): string { try { return decodeURIComponent(s) } catch { return s } }

export default async function GroupPage({ params }: { params: Promise<{ slug: string; groupSlug: string }> }) {
  const p = await params
  const slug = dec(p.slug)
  const groupSlug = dec(p.groupSlug)
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
    .select('id, name, slug, logo_url, status, kesher_page_url, kesher_active, kesher_url_hok, kesher_url_bit, kesher_url_bank')
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
    { count: groupDonorCount },
  ] = await Promise.all([
    supabase
      .from('donations')
      .select('id, donor_name, amount, dedication, created_at, group_id')
      .eq('campaign_id', campaign.id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('groups')
      .select('id, name, slug, goal_amount, raised_amount, manager_name, image_url')
      .eq('campaign_id', campaign.id)
      .order('raised_amount', { ascending: false }),
    supabase
      .from('campaign_gallery')
      .select('id, image_url, caption')
      .eq('campaign_id', campaign.id)
      .order('sort_order'),
    supabase
      .from('donations')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .eq('payment_status', 'completed'),
  ])

  const o = org as Record<string, string>
  const paymentUrls = {
    one_time: o.kesher_page_url || '',
    hok:      o.kesher_url_hok  || '',
    bit:      o.kesher_url_bit  || '',
    bank:     o.kesher_url_bank || '',
  }

  // Payment provider + Nedarim links — guarded so the page still renders if the
  // newer columns aren't present yet (falls back to Kesher / legacy links).
  let paymentProvider = 'kesher'
  let nedarim: { mosad: string; apiValid: string; active: boolean } | null = null
  const { data: pp } = await supabase
    .from('organizations')
    .select('payment_provider, nedarim_mosad, nedarim_api_valid, nedarim_active, nedarim_page_url, nedarim_url_hok, nedarim_url_bit, nedarim_url_bank')
    .eq('id', campaign.org_id)
    .maybeSingle()
  if (pp) {
    const p = pp as Record<string, unknown>
    paymentProvider = (p.payment_provider as string) || 'kesher'
    nedarim = {
      mosad: (p.nedarim_mosad as string) || '',
      apiValid: (p.nedarim_api_valid as string) || '',
      active: !!p.nedarim_active,
    }
    if (paymentProvider === 'nedarim') {
      paymentUrls.one_time = (p.nedarim_page_url as string) || paymentUrls.one_time
      paymentUrls.hok      = (p.nedarim_url_hok  as string) || paymentUrls.hok
      paymentUrls.bit      = (p.nedarim_url_bit  as string) || paymentUrls.bit
      paymentUrls.bank     = (p.nedarim_url_bank as string) || paymentUrls.bank
    }
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
      paymentProvider={paymentProvider}
      nedarim={nedarim}
      activeGroup={{
        id: group.id,
        name: group.name,
        slug: group.slug,
        goal_amount: group.goal_amount,
        raised_amount: group.raised_amount,
        manager_name: group.manager_name,
        image_url: group.image_url,
        donorCount: groupDonorCount ?? 0,
      }}
    />
  )
}
