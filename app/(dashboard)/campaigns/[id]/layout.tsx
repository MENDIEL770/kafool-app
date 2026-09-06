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
    .select('id, title, slug, status, org_id, settings')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const pageType = (campaign.settings as { page_type?: string })?.page_type === 'products' ? 'products' : 'donation'

  return (
    <div className="space-y-0 -mx-4 -mb-4 lg:-m-6">
      <CampaignNav campaign={campaign} pageType={pageType} />
      <div className="p-4 lg:p-6 pt-8 lg:pt-10">
        {children}
      </div>
    </div>
  )
}
