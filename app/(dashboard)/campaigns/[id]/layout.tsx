import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampaignNav from './CampaignNav'

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, status, org_id')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', campaign.org_id)
    .single()

  return (
    <div className="space-y-0 -m-6">
      <CampaignNav campaign={campaign} orgSlug={org?.slug ?? null} />
      <div className="p-6 pt-10">
        {children}
      </div>
    </div>
  )
}
