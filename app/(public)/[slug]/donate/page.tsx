import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DonateClient from './DonateClient'

export default async function DonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ amount?: string; group?: string; caller?: string; error?: string }>
}) {
  const { slug } = await params
  const { amount, group, caller, error } = await searchParams

  const supabase = await createClient()

  // Fetch campaign by slug
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, settings, goal_amount, raised_amount, org_id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!campaign) notFound()

  // Fetch org for branding + Kesher settings
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, status, kesher_page_id, kesher_page_url, kesher_active')
    .eq('id', campaign.org_id)
    .single()

  if (!org) notFound()

  const settings = campaign.settings as { donation_amounts?: number[]; primary_color?: string }

  return (
    <DonateClient
      org={org}
      campaign={campaign}
      settings={settings}
      kesherPageId={org.kesher_page_id || ''}
      kesherPageUrl={org.kesher_page_url || ''}
      kesherActive={org.kesher_active || false}
      presetAmount={amount ? Number(amount) : undefined}
      groupSlug={group}
      callerId={caller}
      paymentError={error === '1'}
    />
  )
}
