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
    .select('id, title, slug, settings, org_id, logo_url')
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
  const thanks = (campaign.settings as { thanks?: { title?: string; message?: string } } | null)?.thanks
  const logoUrl = (campaign as { logo_url?: string | null }).logo_url || org.logo_url || null
  const receiptUrl = sp.receiptLink || sp.receipturl || sp.receipt_url || sp.receiptUrl || null
  const transactionNumber = sp.transactionNumber || sp.NumTransaction || null

  // קשר שולח total באגורות (100 = ₪1)
  const totalAgorot = Number(sp.total ?? sp.Sum ?? 0)
  const totalShekels = totalAgorot / 100
  const isSuccess = totalAgorot > 0 && !sp.errorCode && !!transactionNumber

  if (isSuccess) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const { recomputeCampaignRaised } = await import('@/lib/donations')
    const supabaseService = await createServiceClient()

    // האם העסקה כבר נרשמה? (קובע אם לשלוח SMS — פעם אחת בלבד)
    const { data: existing } = await supabaseService
      .from('donations')
      .select('id')
      .eq('kesher_transaction_id', transactionNumber)
      .maybeSingle()
    const isNew = !existing

    // פרטי התורם מגיעים על ה-successurl (dn/dp/de/dd/dg) ונשמרים בצד השרת
    const donorName = (sp.dn || '').trim() || null
    const donorPhone = (sp.dp || '').trim() || null
    const donorEmail = (sp.de || '').trim() || null
    const dedication = (sp.dd || '').trim() || null

    // הוראת קבע? נרשום את הסכום הכולל (חודשי × חודשים), לא חיוב בודד.
    const isHok = sp.dpt === 'hok'
    const months = Number(sp.dmo || 0)
    const monthly = Number(sp.dma || 0) || totalShekels
    const installments = isHok && months > 0 ? months : null
    const monthlyAmount = isHok ? monthly : null
    const recordedAmount = isHok && months > 0 ? monthly * months : totalShekels

    // שיוך לקבוצה לפי slug
    let groupId: string | null = null
    if (sp.dg) {
      const { data: g } = await supabaseService
        .from('groups').select('id').eq('campaign_id', campaign.id).eq('slug', sp.dg).maybeSingle()
      groupId = g?.id ?? null
    }

    // upsert לפי מספר העסקה — דורס שורה שאולי ה-webhook יצר קודם, ואידמפוטנטי ברענון.
    await supabaseService.from('donations').upsert({
      campaign_id: campaign.id,
      org_id: campaign.org_id,
      amount: recordedAmount,
      donor_name: donorName,
      donor_phone: donorPhone,
      donor_email: donorEmail,
      dedication,
      group_id: groupId,
      kesher_transaction_id: transactionNumber,
      payment_status: 'completed',
      payment_type: isHok ? 'hok' : 'one_time',
      installments,
      monthly_amount: monthlyAmount,
      kesher_raw: sp,
    }, { onConflict: 'kesher_transaction_id' })

    // raised_amount = סכום כל התרומות שהושלמו (ללא drift / ספירה כפולה)
    await recomputeCampaignRaised(supabaseService, campaign.id)
    console.log(`Thanks page: ₪${recordedAmount} (${isHok ? `hok ${months}m` : 'one-time'}) for campaign ${campaign.id}`)

    // הפעל SMS automations פעם אחת בלבד (fire & forget)
    if (isNew) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
      fetch(`${baseUrl}/api/sms/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          amount: recordedAmount,
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
      logoUrl={logoUrl}
      thanksTitle={thanks?.title || null}
      thanksMessage={thanks?.message || null}
    />
  )
}
