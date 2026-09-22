import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refundKesherTransaction } from '@/lib/kesher/client'
import { recomputeCampaignRaised } from '@/lib/donations'

// Refund a donation. Currently supports Kesher credit-card transactions
// (CreditTransaction). On success the donation is marked 'refunded' (so it drops
// out of the campaign total) with the amount/time recorded. RLS scopes access to
// the caller's own org.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { donationId, amount } = await req.json()
  if (!donationId) return NextResponse.json({ error: 'חסר מזהה תרומה' }, { status: 400 })

  const { data: don } = await supabase
    .from('donations')
    .select('id, campaign_id, amount, payment_status, kesher_transaction_id, custom_data')
    .eq('id', donationId).eq('campaign_id', campaignId).maybeSingle()
  if (!don) return NextResponse.json({ error: 'התרומה לא נמצאה' }, { status: 404 })
  if (don.payment_status === 'refunded') return NextResponse.json({ error: 'התרומה כבר הוחזרה במלואה' }, { status: 400 })
  const txn = don.kesher_transaction_id as string | null
  if (!txn) return NextResponse.json({ error: 'לזיכוי אוטומטי נדרש שזו עסקת אשראי של קשר. בצעו את ההחזר בממשק הסליקה.' }, { status: 400 })

  const cur = (don.custom_data as Record<string, unknown>) || {}
  const remaining = Number(don.amount) || 0                        // still-refundable on this row
  const priorRefunded = Number(cur.refunded_amount) || 0
  const original = Number(cur.original_amount) || (remaining + priorRefunded)
  // amount omitted or >= remaining → refund the full remaining; else partial.
  const refundAmt = amount != null && Number(amount) > 0 ? Math.min(Number(amount), remaining) : remaining
  if (!(refundAmt > 0)) return NextResponse.json({ error: 'סכום החזר לא תקין' }, { status: 400 })
  const fully = refundAmt >= remaining

  // Pass an explicit amount to Kesher for any partial (or when partials already
  // happened on this transaction); omit it for a clean full refund.
  const kesherAmount = (!fully || priorRefunded > 0) ? refundAmt : undefined
  const r = await refundKesherTransaction(campaignId, txn, kesherAmount)
  if (!r.success) return NextResponse.json({ error: r.error || 'הזיכוי נכשל' }, { status: 502 })

  const custom_data = { ...cur, refunded_at: new Date().toISOString(), refunded_amount: priorRefunded + refundAmt, original_amount: original }
  if (fully) {
    // whole remaining refunded → mark refunded (drops out of the total)
    await supabase.from('donations').update({ payment_status: 'refunded', custom_data }).eq('id', donationId)
  } else {
    // partial → reduce the counted amount, keep it completed
    await supabase.from('donations').update({ amount: remaining - refundAmt, custom_data }).eq('id', donationId)
  }
  await recomputeCampaignRaised(supabase, campaignId)

  return NextResponse.json({ ok: true, fully, refundAmount: refundAmt, newAmount: fully ? 0 : remaining - refundAmt, totalRefunded: priorRefunded + refundAmt, description: r.description })
}
