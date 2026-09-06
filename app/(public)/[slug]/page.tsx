import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import DonationPageClient from './DonationPageClient'
import ProductSalesClient from './ProductSalesClient'
import KaparotPageClient from './KaparotPageClient'
import { applyCampaignPaymentOverride } from '@/lib/payment'

// Service-role client for public reads that bypass RLS
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

// Route params can arrive percent-encoded (Hebrew slugs) — decode before matching.
function dec(s: string): string { try { return decodeURIComponent(s) } catch { return s } }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = dec((await params).slug)
  const supabase = adminClient()

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
  const s = campaign.settings as { tagline?: string; share_text?: string } | null
  // manager-defined share text wins; else the tagline; else an auto description
  const description = s?.share_text?.trim() || s?.tagline
    || `תרמו לקמפיין "${campaign.title}" — ₪${(campaign.raised_amount || 0).toLocaleString()} גויסו עד כה`
  // Use the manager's uploaded social-share image if set; otherwise the auto-generated one.
  const customShare = (campaign.settings as { share_image?: string } | null)?.share_image
  const ogImageUrl = customShare || `${BASE_URL}/${slug}/opengraph-image`

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

export default async function PublicDonationPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const slug = dec((await params).slug)
  // ?lang=en / ?lang=he lets a manager share a link that opens in a set language.
  const rawLang = (await searchParams)?.lang
  const urlLang: 'he' | 'en' | undefined = rawLang === 'en' ? 'en' : rawLang === 'he' ? 'he' : undefined
  const supabase = adminClient()

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
  ])

  const org      = orgRes.data
  if (!org) notFound()
  // Hide the donor name on the public page when the donation is marked anonymous
  // (by the donor, or by the manager via the checkbox). Never expose custom_data.
  const donations = (donationsRes.data ?? []).map(({ custom_data, ...d }) => {
    const cd = custom_data as Record<string, unknown> | null
    const anon = !!cd && (cd.anonymous === true || cd.anonymous === 'true')
    // Foreign (Stripe) donations carry their original currency + amount so the
    // public feed can show them as e.g. $50 (while `amount` stays ₪ for totals).
    const currency = (typeof cd?.stripe_currency === 'string' ? cd.stripe_currency : 'ils').toLowerCase()
    const origAmount = Number(cd?.stripe_amount) || null
    return { ...d, donor_name: anon ? null : d.donor_name, currency, orig_amount: origAmount }
  })
  const groups   = groupsRes.data
  const gallery  = galleryRes.data

  const o = org as Record<string, string>
  const paymentUrls = {
    one_time: o.kesher_page_url || '',
    hok:      o.kesher_url_hok  || '',
    bit:      o.kesher_url_bit  || '',
    bank:     o.kesher_url_bank || '',
    one_time_en: '',
    hok_en:      '',
  }

  // Payment provider config + English Kesher links — fetched separately and
  // guarded, so if those columns aren't present yet the live page just falls
  // back (Kesher provider, Hebrew payment links).
  let paymentProvider = 'kesher'
  let nedarim: { mosad: string; apiValid: string; active: boolean } | null = null
  const { data: pp } = await supabase
    .from('organizations')
    .select('payment_provider, nedarim_mosad, nedarim_api_valid, nedarim_active, kesher_page_url_en, kesher_url_hok_en, nedarim_page_url, nedarim_url_hok, nedarim_url_bit, nedarim_url_bank, nedarim_page_url_en, nedarim_url_hok_en')
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
      // Nedarim keeps its links in its own columns; fall back to the legacy
      // kesher_* values if the migration hasn't moved them across yet.
      paymentUrls.one_time = (p.nedarim_page_url as string) || paymentUrls.one_time
      paymentUrls.hok      = (p.nedarim_url_hok  as string) || paymentUrls.hok
      paymentUrls.bit      = (p.nedarim_url_bit  as string) || paymentUrls.bit
      paymentUrls.bank     = (p.nedarim_url_bank as string) || paymentUrls.bank
      paymentUrls.one_time_en = (p.nedarim_page_url_en as string) || ''
      paymentUrls.hok_en      = (p.nedarim_url_hok_en  as string) || ''
    } else {
      paymentUrls.one_time_en = (p.kesher_page_url_en as string) || ''
      paymentUrls.hok_en = (p.kesher_url_hok_en as string) || ''
    }
  }

  // Per-campaign payment override (optional). When a campaign has its own
  // clearing links in settings.payment they win; anything left empty — and every
  // existing campaign, which has no settings.payment at all — inherits the org's
  // connection, so active campaigns keep working exactly as before.
  applyCampaignPaymentOverride(campaign.settings, (patch) => {
    if (patch.provider) paymentProvider = patch.provider
    if (patch.urls) Object.assign(paymentUrls, patch.urls)
    if (patch.nedarim) nedarim = { mosad: patch.nedarim.mosad || nedarim?.mosad || '', apiValid: patch.nedarim.apiValid || nedarim?.apiValid || '', active: true }
  }, paymentProvider)

  // Product sales page — a distinct public layout (banner + products + cart +
  // checkout) instead of the donation page. Everything else (payment resolution
  // above) is shared.
  if ((campaign.settings as { page_type?: string })?.page_type === 'products') {
    return (
      <ProductSalesClient
        campaign={campaign}
        initialLang={urlLang}
        paymentUrls={paymentUrls}
        paymentProvider={paymentProvider}
        nedarim={nedarim}
      />
    )
  }

  // Kaparot (soul-redemption) page — its own layout + the shared DonationModal for payment.
  if ((campaign.settings as { page_type?: string })?.page_type === 'kaparot') {
    return (
      <KaparotPageClient
        org={org}
        campaign={campaign}
        initialLang={urlLang}
        donationUrl={paymentUrls.one_time}
        paymentUrls={paymentUrls}
        paymentProvider={paymentProvider}
        nedarim={nedarim}
      />
    )
  }

  return (
    <DonationPageClient
      org={org}
      campaign={campaign}
      initialLang={urlLang}
      donations={donations || []}
      groups={(groups || []) as Parameters<typeof DonationPageClient>[0]['groups']}
      gallery={gallery || []}
      donationUrl={paymentUrls.one_time}
      paymentUrls={paymentUrls}
      paymentProvider={paymentProvider}
      nedarim={nedarim}
    />
  )
}
