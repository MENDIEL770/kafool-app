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

  const { donationId } = await req.json()
  if (!donationId) return NextResponse.json({ error: 'חסר מזהה תרומה' }, { status: 400 })

  const { data: don } = await supabase
    .from('donations')
    .select('id, campaign_id, amount, payment_status, kesher_transaction_id, custom_data')
    .eq('id', donationId).eq('campaign_id', campaignId).maybeSingle()
  if (!don) return NextResponse.json({ error: 'התרומה לא נמצאה' }, { status: 404 })
  if (don.payment_status === 'refunded') return NextResponse.json({ error: 'התרומה כבר הוחזרה' }, { status: 400 })
  const txn = don.kesher_transaction_id as string | null
  if (!txn) return NextResponse.json({ error: 'לזיכוי אוטומטי נדרש שזו עסקת אשראי של קשר. בצעו את ההחזר בממשק הסליקה.' }, { status: 400 })

  const r = await refundKesherTransaction(campaignId, txn)
  if (!r.success) return NextResponse.json({ error: r.error || 'הזיכוי נכשל' }, { status: 502 })

  const custom_data = { ...(don.custom_data as Record<string, unknown> || {}), refunded_at: new Date().toISOString(), refunded_amount: don.amount }
  await supabase.from('donations').update({ payment_status: 'refunded', custom_data }).eq('id', donationId)
  await recomputeCampaignRaised(supabase, campaignId)

  return NextResponse.json({ ok: true, description: r.description })
}
