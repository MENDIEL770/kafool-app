// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseKesherPayload, isSuccessfulPayment } from '@/lib/kesher/webhook'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // תמיד 200
  }

  try {
    const supabase = await createServiceClient()
    const payload = body as Parameters<typeof parseKesherPayload>[0]

    // חלץ donationId מ-adddata
    const donationId =
      payload?.Transaction?.adddata ||
      payload?.adddata ||
      null

    const kesherStatus =
      Number(payload?.Transaction?.KesherStatus ?? payload?.KesherStatus ?? 0)

    const numTransaction =
      payload?.Transaction?.NumTransaction ||
      payload?.NumTransaction ||
      null

    const receiptLink =
      payload?.Transaction?.DocumentsDetails?.PdfLink || null

    const isSuccess = isSuccessfulPayment(payload)

    if (!isSuccess) {
      console.warn('Kesher webhook: payment not successful, status:', kesherStatus)
      return NextResponse.json({ ok: true })
    }

    const amountTotal =
      Number(payload?.Transaction?.Total ?? payload?.Total ?? 0)
    const amountAgorot = Math.round(amountTotal * 100)

    const donorName = [
      payload?.Transaction?.FirstName ?? payload?.FirstName ?? '',
      payload?.Transaction?.LastName ?? payload?.LastName ?? '',
    ].filter(Boolean).join(' ') || null

    const donorPhone = payload?.Transaction?.Tel ?? payload?.Tel ?? null
    const donorEmail = payload?.Transaction?.Mail ?? payload?.Mail ?? null

    // adddata = campaign UUID (שנשלח מהאתר כ-addactiondata)
    const campaignId = donationId // כי adddata = campaign.id

    if (!campaignId) {
      console.warn('Kesher webhook: no campaignId in adddata')
      return NextResponse.json({ ok: true })
    }

    // הכנס תרומה חדשה
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('org_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      console.warn('Kesher webhook: campaign not found', campaignId)
      return NextResponse.json({ ok: true })
    }

    await supabase.from('donations').insert({
      campaign_id: campaignId,
      org_id: campaign.org_id,
      amount: amountTotal,
      amount_agorot: amountAgorot,
      donor_name: donorName,
      donor_phone: donorPhone,
      donor_email: donorEmail,
      kesher_transaction_id: numTransaction,
      kesher_status_code: kesherStatus,
      payment_status: 'completed',
      status: 'success',
      receipt_link: receiptLink || null,
      kesher_raw: body,
    })

    // עדכן סכום קמפיין
    await supabase.rpc('increment_campaign_amount', {
      campaign_id: campaignId,
      amount_agorot: amountAgorot,
    })

    console.log(`✅ Kesher webhook: ₪${amountTotal} for campaign ${campaignId} from ${donorName}`)
  } catch (err) {
    console.error('Kesher webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-kesher-webhook' })
}
