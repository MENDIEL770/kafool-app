import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampaignMediaClient from './CampaignMediaClient'

export default async function CampaignMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, org_id, cover_image_url, logo_url, video_url, settings')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', campaign.org_id)
    .single()

  const { data: gallery } = await supabase
    .from('campaign_gallery')
    .select('id, image_url, caption, sort_order')
    .eq('campaign_id', id)
    .order('sort_order')

  const settings = (campaign.settings as Record<string, unknown>) || {}

  return (
    <CampaignMediaClient
      campaignId={id}
      campaignTitle={campaign.title}
      campaignSlug={campaign.slug}
      orgId={campaign.org_id}
      orgName={org?.name || ''}
      orgLogoUrl={org?.logo_url || null}
      initialCoverUrl={campaign.cover_image_url || null}
      initialLogoUrl={campaign.logo_url || null}
      initialVideoUrl={campaign.video_url || null}
      initialGallery={gallery || []}
      initialSettings={settings}
    />
  )
}
