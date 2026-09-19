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
  const thanks = (campaign.settings as { thanks?: { title?: string; message?: string; sub_text?: string; button_label?: string; button_url?: string } } | null)?.thanks
  // Kaparot completion: "הכפרה הושלמה" + a blessing from the Chabad house (editable
  // via settings.kaparot.blessing, otherwise a default that names the org).
  const isKaparot = (campaign.settings as { page_type?: string })?.page_type === 'kaparot'
  const kapBlessing = ((campaign.settings as { kaparot?: { blessing?: string } })?.kaparot?.blessing || '').trim()
    || `צוות ${org.name} מאחל לך כתיבה וחתימה טובה,\nשנה טובה ומתוקה לך ולמשפחתך 🍎🍯`
  const logoUrl = (campaign as { logo_url?: string | null }).logo_url || org.logo_url || null
  const receiptUrl = sp.receiptLink || sp.receipturl || sp.receipt_url || sp.receiptUrl || null
  const transactionNumber = sp.transactionNumber || sp.NumTransaction || null
  // Nedarim passes ?tx=; Kesher passes transactionNumber. Either way this is the
  // id the thank-you page verifies actually recorded a completed donation.
  const pendingTx = transactionNumber || sp.tx || null

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
    // receipt_url נשמר בעמודה ייעודית (לא ב-custom_data, כי attachCustomData דורס אותו).
    const row: Record<string, unknown> = {
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
    }
    if (receiptUrl) row.receipt_url = receiptUrl
    type SavedRow = { id: string; custom_data: Record<string, unknown> | null }
    let saved: SavedRow | null = null
    {
      const up = await supabaseService.from('donations').upsert(row, { onConflict: 'kesher_transaction_id' }).select('id, custom_data').single()
      // אם עמודת receipt_url עדיין לא הורצה במיגרציה — ננסה שוב בלעדיה (הקבלה עדיין ב-kesher_raw).
      if (up.error && /receipt_url/i.test(up.error.message)) {
        delete row.receipt_url
        const up2 = await supabaseService.from('donations').upsert(row, { onConflict: 'kesher_transaction_id' }).select('id, custom_data').single()
        saved = (up2.data as SavedRow | null) || null
      } else {
        saved = (up.data as SavedRow | null) || null
      }
    }

    // Custom form values (e.g. the redeemed souls on a kaparot page) live on the
    // donor's intent, and are normally re-attached by the payment webhook. When
    // the thank-you redirect records the donation first, the webhook then sees the
    // row already exists and skips that step — so the fields (and the kaparot
    // confirmation email) would be lost. Recover them here from the matching
    // recent intent.
    if (saved?.id) {
      const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const { data: intents } = await supabaseService
        .from('donation_intents')
        .select('phone, amount, custom_data, created_at')
        .eq('campaign_id', campaign.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(50)
      const norm = (p?: string | null) => (p || '').replace(/\D/g, '').replace(/^0/, '972')
      const wantPhone = norm(donorPhone)
      const amt = Math.round(recordedAmount)
      const match =
        (intents || []).find(i => wantPhone && norm(i.phone as string) === wantPhone && Math.round(Number(i.amount) || 0) === amt)
        || (intents || []).find(i => Math.round(Number(i.amount) || 0) === amt)
      const cd = match?.custom_data as Record<string, unknown> | null

      // Fill custom_data from the intent when the row has none yet (fills empties
      // only, never overwrites; drops reserved __ keys).
      if (cd && (!saved.custom_data || Object.keys(saved.custom_data).length === 0)) {
        const clean = Object.fromEntries(Object.entries(cd).filter(([k]) => !k.startsWith('__')))
        // Persist how the donation came in (credit / Bit / bank / הו"ק).
        const rawMethod = String(cd.__method || '') || (isHok ? 'hok' : '')
        if (rawMethod && !clean.payment_method) clean.payment_method = rawMethod
        if (Object.keys(clean).length > 0) {
          await supabaseService.from('donations').update({ custom_data: clean }).eq('id', saved.id)
        }
      }

      // Kaparot confirmation email — lists the redeemed souls. The origin kaparot
      // campaign is carried on the intent (__kaparot_origin), so this fires even
      // when the donation is funneled into a normal campaign. Only on a NEW record
      // (isNew) so a page refresh doesn't re-send; the webhook won't duplicate it
      // because it skips the already-recorded row.
      const originId = cd && typeof cd.__kaparot_origin === 'string' ? cd.__kaparot_origin : null
      if (isNew && originId && donorEmail) {
        try {
          const { data: kap } = await supabaseService
            .from('campaigns').select('title, org_id, settings').eq('id', originId).single()
          const kCfg = (kap?.settings as { kaparot?: { chabad_logo_url?: string; email?: { subject?: string; body?: string; image_url?: string } } } | null)?.kaparot || {}
          const { data: kOrg } = kap?.org_id
            ? await supabaseService.from('organizations').select('name, logo_url').eq('id', kap.org_id).single()
            : { data: null }
          const orgName = (kOrg as { name?: string })?.name || kap?.title || ''
          const namesStr = String(cd?.['שמות הנפשות'] || '')
          const names = namesStr ? namesStr.split(' · ') : []
          const soulsCount = Number(cd?.['מספר נפשות']) || names.length || 1
          const { renderKaparotHtml, sendHtmlEmail } = await import('@/lib/email')
          const html = renderKaparotHtml({
            orgName,
            logoUrl: kCfg.chabad_logo_url || (kOrg as { logo_url?: string })?.logo_url || null,
            souls: soulsCount, names, amount: recordedAmount,
            customBody: kCfg.email?.body || null, imageUrl: kCfg.email?.image_url || null,
          })
          await sendHtmlEmail(donorEmail, kCfg.email?.subject?.trim() || `אישור פדיון כפרות — ${orgName}`, html)
        } catch (e) {
          console.error('kaparot email (thanks) error:', e)
        }
      }
    }

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
  } else if (sp.errorCode && (sp.dp || '').trim()) {
    // Explicit payment failure returned to /thanks — let the donor know (WhatsApp)
    // with a retry link, if the org's WhatsApp add-on is active.
    const { createServiceClient } = await import('@/lib/supabase/server')
    const { notifyDonationFailedWhatsApp } = await import('@/lib/donations')
    const svc = await createServiceClient()
    await notifyDonationFailedWhatsApp(svc, {
      campaignId: campaign.id,
      phone: (sp.dp || '').trim(),
      donorName: (sp.dn || '').trim() || null,
      amount: (Number(sp.total ?? sp.Sum ?? 0)) / 100,
    }).catch(() => {})
  }

  // Has a completed donation for this transaction already landed? If so the
  // client can congratulate immediately; otherwise it polls (shows a spinner).
  let initiallyConfirmed = false
  if (pendingTx) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const svc = await createServiceClient()
    const { data: existingDon } = await svc
      .from('donations')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('kesher_transaction_id', pendingTx)
      .eq('payment_status', 'completed')
      .maybeSingle()
    initiallyConfirmed = !!existingDon
  }

  return (
    <ThanksClient
      slug={slug}
      campaignId={campaign.id}
      orgName={org.name}
      campaignTitle={campaign.title}
      primaryColor={primaryColor}
      receiptUrl={receiptUrl}
      transactionNumber={transactionNumber}
      pendingTx={pendingTx}
      initiallyConfirmed={initiallyConfirmed}
      logoUrl={logoUrl}
      thanksTitle={thanks?.title || (isKaparot ? 'הכפרה הושלמה! 🕊️' : null)}
      thanksMessage={thanks?.message || (isKaparot ? kapBlessing : null)}
      isOrder={(campaign.settings as { page_type?: string })?.page_type === 'products'}
      subText={thanks?.sub_text || null}
      buttonLabel={thanks?.button_label || null}
      buttonUrl={thanks?.button_url || null}
    />
  )
}
