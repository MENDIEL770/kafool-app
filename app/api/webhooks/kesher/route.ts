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

    if (!donationId) {
      // legacy: try parsing from addactiondata
      const parsed = parseKesherPayload(payload)
      console.warn('Kesher webhook: no donationId in adddata', parsed)
      return NextResponse.json({ ok: true })
    }

    // עדכן donation
    const { data: donation } = await supabase
      .from('donations')
      .update({
        kesher_transaction_id: numTransaction,
        kesher_status_code: kesherStatus,
        payment_status: isSuccess ? 'completed' : 'failed',
        status: isSuccess ? 'success' : 'failed',
        receipt_link: receiptLink || null,
        kesher_raw: body,
      })
      .eq('id', donationId)
      .select('campaign_id, org_id, amount_agorot, amount, donor_name')
      .single()

    if (!donation) {
      console.warn('Kesher webhook: donation not found', donationId)
      return NextResponse.json({ ok: true })
    }

    if (isSuccess) {
      const amountAgorot = donation.amount_agorot || Math.round((donation.amount || 0) * 100)

      // עדכן סכום קמפיין
      await supabase.rpc('increment_campaign_amount', {
        campaign_id: donation.campaign_id,
        amount_agorot: amountAgorot,
      })

      console.log(`✅ Kesher success: donation ${donationId} — ₪${donation.amount} from ${donation.donor_name}`)
    }
  } catch (err) {
    console.error('Kesher webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'kafool-kesher-webhook' })
}
