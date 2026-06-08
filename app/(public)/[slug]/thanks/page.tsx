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

  // קשר שולח פרמטרים ב-successurl — נעדכן את הסכום כאן
  const total = Number(sp.total ?? sp.Sum ?? 0)
  const transactionNumber = sp.transactionNumber || sp.NumTransaction || null
  const kesherStatus = Number(sp.KesherStatus ?? sp.status ?? 0)
  const SUCCESS_CODES = [4, 11]
  const isSuccess = SUCCESS_CODES.includes(kesherStatus) || (total > 0 && !sp.errorCode)

  if (isSuccess && total > 0 && transactionNumber) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabaseService = await createServiceClient()

    // בדוק שהעסקה לא קיימת כבר
    const { data: existing } = await supabaseService
      .from('donations')
      .select('id')
      .eq('kesher_transaction_id', transactionNumber)
      .single()

    if (!existing) {
      const donorName = sp.ReceiptName || null
      await supabaseService.from('donations').insert({
        campaign_id: campaign.id,
        org_id: campaign.org_id,
        amount: total,
        donor_name: donorName,
        kesher_transaction_id: transactionNumber,
        payment_status: 'completed',
        kesher_raw: sp,
      })
      await supabaseService.rpc('increment_campaign_amount', {
        campaign_id: campaign.id,
        amount_agorot: Math.round(total * 100),
      })
      console.log(`✅ Thanks page: recorded ₪${total} donation for campaign ${campaign.id}`)
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
