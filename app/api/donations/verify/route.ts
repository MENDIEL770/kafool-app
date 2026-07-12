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
  if (!campaignId || !tx) return NextResponse.json({ confirmed: false }, { status: 400 })

  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('donations')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('kesher_transaction_id', tx)
      .eq('payment_status', 'completed')
      .maybeSingle()
    return NextResponse.json({ confirmed: !!data })
  } catch {
    return NextResponse.json({ confirmed: false }, { status: 200 })
  }
}
