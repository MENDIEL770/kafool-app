import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import DonationPageClient from '../../DonationPageClient'

// Cookie-less service-role client so the page can be cached (ISR) under load
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

export const revalidate = 60 // ISR — cache for 60 seconds

// Route params can arrive percent-encoded (Hebrew slugs), so decode defensively
// before matching them against the stored slug.
function dec(s: string): string { try { return decodeURIComponent(s) } catch { return s } }

// Social-share preview for a GROUP link — same image the campaign uses so a shared
// group URL shows a rich card (with the group's name in the title).
export async function generateMetadata({ params }: { params: Promise<{ slug: string; groupSlug: string }> }): Promise<Metadata> {
  const p = await params
  const slug = dec(p.slug)
  const groupSlug = dec(p.groupSlug)
  const supabase = adminClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('id, title, settings, org_id').eq('slug', slug).maybeSingle()
  if (!campaign) return { title: 'Kafool' }

  const [{ data: org }, { data: group }] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', campaign.org_id).maybeSingle(),
    supabase.from('groups').select('name, image_url').eq('campaign_id', campaign.id).eq('slug', groupSlug).maybeSingle(),
  ])

  const groupName = group?.name?.trim()
  const title = groupName
    ? `${groupName} · ${campaign.title} | ${org?.name ?? 'Kafool'}`
    : `${campaign.title} | ${org?.name ?? 'Kafool'}`
  const s = campaign.settings as { tagline?: string; share_text?: string; share_image?: string } | null
  const description = s?.share_text?.trim() || s?.tagline
    || (groupName ? `הצטרפו לקבוצת "${groupName}" בקמפיין "${campaign.title}"` : `תרמו לקמפיין "${campaign.title}"`)
  // Prefer the campaign's uploaded social image, then the group's own image, then
  // the auto-generated campaign OG image.
  const ogImageUrl = s?.share_image || group?.image_url || `${BASE_URL}/${slug}/opengraph-image`
  const url = `${BASE_URL}/${slug}/g/${groupSlug}`

  return {
    title,
    description,
    openGraph: {
      title, description, url, siteName: 'Kafool',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: groupName || campaign.title }],
      locale: 'he_IL', type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImageUrl] },
  }
}

export default async function GroupPage({ params, searchParams }: { params: Promise<{ slug: string; groupSlug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const p = await params
  const slug = dec(p.slug)
  const groupSlug = dec(p.groupSlug)
  const rawLang = (await searchParams)?.lang
  const urlLang: 'he' | 'en' | undefined = rawLang === 'en' ? 'en' : rawLang === 'he' ? 'he' : undefined
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
      .select('id, donor_name, amount, dedication, created_at, group_id, payment_type, monthly_amount, installments, custom_data')
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

  // Surface each donation's original currency (foreign donations show as $/€/£),
  // and hide anonymous names — same shape the campaign page uses.
  const feedDonations = (donations || []).map(({ custom_data, ...d }) => {
    const cd = custom_data as Record<string, unknown> | null
    const anon = !!cd && (cd.anonymous === true || cd.anonymous === 'true')
    const currency = (typeof cd?.stripe_currency === 'string' ? cd.stripe_currency : 'ils').toLowerCase()
    const origAmount = Number(cd?.stripe_amount) || null
    return { ...d, donor_name: anon ? null : d.donor_name, currency, orig_amount: origAmount }
  })

  // Per-group default language: ?lang override → the group's setting → (client
  // falls back to the campaign default when neither is set).
  const gLang = (group as { default_lang?: string }).default_lang
  const initialLang = urlLang || (gLang === 'en' ? 'en' : gLang === 'he' ? 'he' : undefined)

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
      initialLang={initialLang}
      donations={feedDonations}
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
