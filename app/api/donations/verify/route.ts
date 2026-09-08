import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Public, read-only: has a COMPLETED donation with this transaction id actually
 * landed for this campaign? The thank-you page polls this so it only congratulates
 * once the payment is truly recorded (via the Nedarim/Kesher server callback or the
 * client backstop), instead of celebrating a charge that may have failed.
 */
export async function GET(req: NextRequest) {
  if (!rateLimit(`verify:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ confirmed: false }, { status: 429 })
  }
  const { searchParams } = new URL(req.url)
  const campaignId = (searchParams.get('campaignId') || '').trim()
  const tx = (searchParams.get('tx') || '').trim()
  const phone = (searchParams.get('phone') || '').trim()
  const amount = Number(searchParams.get('amount') || '')
  // Either a transaction id, or a phone+amount (for Bit — no tx exists until the
  // in-app payment settles and the callback records the order).
  if (!campaignId || (!tx && !(phone && amount > 0))) return NextResponse.json({ confirmed: false }, { status: 400 })

  try {
    const supabase = await createServiceClient()
    if (tx) {
      const { data } = await supabase
        .from('donations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('kesher_transaction_id', tx)
        .eq('payment_status', 'completed')
        .maybeSingle()
      return NextResponse.json({ confirmed: !!data })
    }
    // Match a recently-recorded completed order by normalized phone + amount.
    const norm = (p: unknown) => String(p ?? '').replace(/\D/g, '').replace(/^972/, '0').slice(-10)
    const sinceIso = new Date(Date.now() - 45 * 60_000).toISOString()
    const { data } = await supabase
      .from('donations')
      .select('id, donor_phone, amount')
      .eq('campaign_id', campaignId)
      .eq('payment_status', 'completed')
      .gt('created_at', sinceIso)
      .limit(200)
    const target = norm(phone)
    const hit = (data || []).some(d => norm(d.donor_phone) === target && Math.round(Number(d.amount)) === Math.round(amount))
    return NextResponse.json({ confirmed: hit })
  } catch {
    return NextResponse.json({ confirmed: false }, { status: 200 })
  }
}
