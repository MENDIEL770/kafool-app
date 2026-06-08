import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ThanksClient from './ThanksClient'

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, slug, settings, org_id')
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

  const primaryColor = (campaign.settings as { primary_color?: string })?.primary_color || '#2563eb'
  const receiptUrl = sp.receipturl || sp.receipt_url || sp.receiptUrl || null

  return (
    <ThanksClient
      slug={slug}
      orgName={org.name}
      campaignTitle={campaign.title}
      primaryColor={primaryColor}
      receiptUrl={receiptUrl}
    />
  )
}
