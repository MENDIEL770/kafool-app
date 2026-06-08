// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// KesherStatus codes = success
const SUCCESS_CODES = [4, 11]

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    const contentType = req.headers.get('content-type') || ''
    const rawText = await req.text()

    console.log('Kesher webhook content-type:', contentType)
    console.log('Kesher webhook raw body:', rawText.substring(0, 500))

    if (contentType.includes('application/json')) {
      body = JSON.parse(rawText)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawText)
      params.forEach((value, key) => { body[key] = value })
    } else {
      // נסה JSON קודם, אחר כך form-urlencoded
      try {
        body = JSON.parse(rawText)
      } catch {
        const params = new URLSearchParams(rawText)
        params.forEach((value, key) => { body[key] = value })
      }
    }
  } catch (e) {
    console.error('Kesher webhook parse error:', e)
    return NextResponse.json({ ok: true })
  }

  console.log('Kesher webhook received:', JSON.stringify(body))

  try {
    // Kesher שולח flat JSON — לא nested תחת Transaction
    // סנן רק עסקאות מדפי התשלום שמוגדרים בקמפיינים שלנו
    const paymentPageNum = String(body?.PaymentPageNum ?? body?.ProjectNumber ?? '')
    const ALLOWED_PAGES = (process.env.KESHER_ALLOWED_PAGES || '').split(',').map(s => s.trim()).filter(Boolean)
    if (ALLOWED_PAGES.length > 0 && paymentPageNum && !ALLOWED_PAGES.includes(paymentPageNum)) {
      console.log(`Kesher webhook: ignoring page ${paymentPageNum} (not in allowed list)`)
      return NextResponse.json({ ok: true })
    }

    const kesherStatus = Number(body?.KesherStatus ?? 0)
    const isSuccess = SUCCESS_CODES.includes(kesherStatus)

    if (!isSuccess) {
      console.log(`Kesher webhook: not success, status=${kesherStatus}`)
      return NextResponse.json({ ok: true })
    }

    const amountTotal = Number(body?.Sum ?? 0)
    const amountAgorot = Math.round(amountTotal * 100)
    const numTransaction = String(body?.NumTransaction ?? '')

    // campaign ID חוזר ב-Details או adddata (מה ששלחנו כ-addactiondata)
    const campaignId = String(body?.Details ?? body?.adddata ?? body?.ref ?? '').trim() || null

    // שם תורם
    const receiptName = String(body?.ReceiptName ?? '').trim() || null
    const donorName = receiptName || null

    // קישור קבלה
    const pdfLink = (body?.DocumentsDetails as any)?.PdfLink || null

    console.log(`Kesher webhook: success! amount=₪${amountTotal}, campaignId=${campaignId}, status=${kesherStatus}`)

    if (!campaignId) {
      console.warn('Kesher webhook: no campaignId in Details field')
      return NextResponse.json({ ok: true })
    }

    const supabase = await createServiceClient()

    // וודא שהקמפיין קיים
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      console.warn('Kesher webhook: campaign not found:', campaignId)
      return NextResponse.json({ ok: true })
    }

    // הכנס תרומה
    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: amountTotal,
      donor_name: donorName,
      kesher_transaction_id: numTransaction || null,
      payment_status: 'completed',
      kesher_raw: body,
    })

    // עדכן סכום קמפיין
    await supabase.rpc('increment_campaign_amount', {
      campaign_id: campaignId,
      amount_agorot: amountAgorot,
    })

    console.log(`✅ Donation saved: ₪${amountTotal} for campaign ${campaignId}`)
  } catch (err) {
    console.error('Kesher webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  // קשר שולח GET עם query params
  const { searchParams } = new URL(req.url)
  if (searchParams.size === 0) {
    return NextResponse.json({ ok: true, service: 'kafool-kesher-webhook' })
  }

  // המר query params לאובייקט ועבד
  const body: Record<string, unknown> = {}
  searchParams.forEach((value, key) => { body[key] = value })

  console.log('Kesher GET webhook params:', JSON.stringify(body))

  try {
    const kesherStatus = Number(body?.KesherStatus ?? 0)
    const isSuccess = SUCCESS_CODES.includes(kesherStatus)

    if (!isSuccess) {
      console.log(`Kesher GET webhook: not success, status=${kesherStatus}`)
      return NextResponse.json({ ok: true })
    }

    const amountTotal = Number(body?.Sum ?? body?.total ?? 0)
    const amountAgorot = Math.round(amountTotal * 100)
    const numTransaction = String(body?.NumTransaction ?? body?.transactionNumber ?? '')
    const campaignId = String(body?.Details ?? body?.adddata ?? body?.ref ?? '').trim() || null
    const donorName = String(body?.ReceiptName ?? '').trim() || null

    if (!campaignId) {
      console.warn('Kesher GET webhook: no campaignId')
      return NextResponse.json({ ok: true })
    }

    const supabase = await createServiceClient()
    const { data: campaign } = await supabase.from('campaigns').select('org_id').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ ok: true })

    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: amountTotal,
      donor_name: donorName,
      kesher_transaction_id: numTransaction || null,
      payment_status: 'completed',
      kesher_raw: body,
    })

    await supabase.rpc('increment_campaign_amount', { campaign_id: campaignId, amount_agorot: amountAgorot })
    console.log(`✅ GET webhook: ₪${amountTotal} for campaign ${campaignId}`)
  } catch (err) {
    console.error('Kesher GET webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}
