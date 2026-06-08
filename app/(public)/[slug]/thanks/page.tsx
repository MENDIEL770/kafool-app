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
  const receiptUrl = sp.receipturl || sp.receipt_url || sp.receiptUrl || sp.receiptLink || null

  // קשר שולח total באגורות (100 = ₪1)
  const totalAgorot = Number(sp.total ?? sp.Sum ?? 0)
  const totalShekels = totalAgorot / 100
  const transactionNumber = sp.transactionNumber || sp.NumTransaction || null
  const isSuccess = totalAgorot > 0 && !sp.errorCode && transactionNumber

  if (isSuccess) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabaseService = await createServiceClient()

    // בדוק שהעסקה לא קיימת כבר (idempotency)
    const { data: existing } = await supabaseService
      .from('donations')
      .select('id')
      .eq('kesher_transaction_id', transactionNumber)
      .single()

    if (!existing) {
      await supabaseService.from('donations').insert({
        campaign_id: campaign.id,
        org_id: campaign.org_id,
        amount: totalShekels,
        donor_name: null, // יתעדכן מ-localStorage בצד הלקוח
        kesher_transaction_id: transactionNumber,
        payment_status: 'completed',
        kesher_raw: sp,
      })
      await supabaseService.rpc('increment_campaign_amount', {
        campaign_id: campaign.id,
        amount_agorot: totalAgorot,
      })
      console.log(`✅ Thanks page: ₪${totalShekels} for campaign ${campaign.id}`)
    }
  }

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
