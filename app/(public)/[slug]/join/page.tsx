import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import JoinClient from './JoinClient'

// Service-role client so the page works before the campaign is "active".
function adminClient() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function dec(s: string): string { try { return decodeURIComponent(s) } catch { return s } }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = dec((await params).slug)
  const { data } = await adminClient().from('campaigns').select('title').eq('slug', slug).maybeSingle()
  return { title: data?.title ? `פתחו קבוצת גיוס — ${data.title}` : 'פתחו קבוצת גיוס' }
}

const sortUrls = (v?: { url: string; sort_order: number }[]) =>
  v?.length ? [...v].sort((a, b) => a.sort_order - b.sort_order).map(b => b.url) : []

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = dec((await params).slug)
  const supabase = adminClient()

  // Any status — this is a pre-launch page the manager shares before going live.
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, settings, cover_image_url, logo_url, org_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations').select('name, logo_url').eq('id', campaign.org_id).maybeSingle()

  const s = (campaign.settings || {}) as {
    banners?: { url: string; sort_order: number }[]
    mobile_banners?: { url: string; sort_order: number }[]
    primary_color?: string
    join_intro?: string
  }
  const desktop = sortUrls(s.banners).length ? sortUrls(s.banners) : (campaign.cover_image_url ? [campaign.cover_image_url] : [])
  const mobile = sortUrls(s.mobile_banners).length ? sortUrls(s.mobile_banners) : desktop

  return (
    <JoinClient
      campaign={{ id: campaign.id, title: campaign.title, slug: campaign.slug }}
      desktopBanners={desktop}
      mobileBanners={mobile}
      primaryColor={s.primary_color || '#2563eb'}
      logoUrl={campaign.logo_url || org?.logo_url || null}
      orgName={org?.name || ''}
      intro={s.join_intro || ''}
    />
  )
}
