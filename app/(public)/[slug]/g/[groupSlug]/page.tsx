import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GroupPageClient from './GroupPageClient'

export default async function GroupPage({ params }: { params: Promise<{ slug: string; groupSlug: string }> }) {
  const { slug, groupSlug } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url')
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

  const { data: donations } = await supabase
    .from('donations')
    .select('id, donor_name, amount, dedication, created_at')
    .eq('group_id', group.id)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <GroupPageClient
      org={org}
      campaign={campaign}
      group={group}
      donations={donations || []}
    />
  )
}
