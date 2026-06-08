// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// KesherStatus codes = success
const SUCCESS_CODES = [4, 11]

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
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

    // campaign ID חוזר ב-Details (מה ששלחנו כ-addactiondata)
    const campaignId = String(body?.Details ?? '').trim() || null

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

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-kesher-webhook' })
}
