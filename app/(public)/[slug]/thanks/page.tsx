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
  const receiptUrl = sp.receiptLink || sp.receipturl || sp.receipt_url || sp.receiptUrl || null
  const transactionNumber = sp.transactionNumber || sp.NumTransaction || null

  // קשר שולח total באגורות (100 = ₪1)
  const totalAgorot = Number(sp.total ?? sp.Sum ?? 0)
  const totalShekels = totalAgorot / 100
  const isSuccess = totalAgorot > 0 && !sp.errorCode && !!transactionNumber

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
      // פרטי התורם מגיעים על ה-successurl (dn/dp/de/dd/dg) ונשמרים בצד השרת
      const donorName = (sp.dn || '').trim() || null
      const donorPhone = (sp.dp || '').trim() || null
      const donorEmail = (sp.de || '').trim() || null
      const dedication = (sp.dd || '').trim() || null

      // שיוך לקבוצה לפי slug
      let groupId: string | null = null
      if (sp.dg) {
        const { data: g } = await supabaseService
          .from('groups').select('id').eq('campaign_id', campaign.id).eq('slug', sp.dg).maybeSingle()
        groupId = g?.id ?? null
      }

      await supabaseService.from('donations').insert({
        campaign_id: campaign.id,
        org_id: campaign.org_id,
        amount: totalShekels,
        donor_name: donorName,
        donor_phone: donorPhone,
        donor_email: donorEmail,
        dedication,
        group_id: groupId,
        kesher_transaction_id: transactionNumber,
        payment_status: 'completed',
        kesher_raw: sp,
      })
      await supabaseService.rpc('increment_campaign_amount', {
        campaign_id: campaign.id,
        amount_agorot: totalAgorot,
      })
      // עדכן את סכום הקבוצה אם שויכה
      if (groupId) {
        const { data: grp } = await supabaseService.from('groups').select('raised_amount').eq('id', groupId).single()
        if (grp) await supabaseService.from('groups').update({ raised_amount: (grp.raised_amount || 0) + totalShekels }).eq('id', groupId)
      }
      console.log(`Thanks page: ₪${totalShekels} for campaign ${campaign.id}`)

      // הפעל SMS automations (fire & forget)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
      fetch(`${baseUrl}/api/sms/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          amount: totalShekels,
          donor_phone: donorPhone,
          donor_name: donorName,
        }),
      }).catch(() => {})
    }
  }

  return (
    <ThanksClient
      slug={slug}
      orgName={org.name}
      campaignTitle={campaign.title}
      primaryColor={primaryColor}
      receiptUrl={receiptUrl}
      transactionNumber={transactionNumber}
    />
  )
}
