import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Store the custom-form values a donor filled in our modal, just before they
 * leave for the hosted payment page. The Nedarim/Kesher callback re-attaches
 * them to the recorded donation by matching (campaign_id, phone, amount).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const campaignId = String(body.campaignId || '')
  const customData = body.customData
  if (!campaignId || !customData || typeof customData !== 'object') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const phone = body.phone ? String(body.phone) : null
  const amount = Number(body.amount) || null
  const groupSlug = body.groupSlug ? String(body.groupSlug) : null

  try {
    const supabase = await createServiceClient()
    await supabase.from('donation_intents').insert({
      campaign_id: campaignId,
      group_slug: groupSlug,
      phone,
      amount,
      custom_data: customData,
    })
  } catch (e) {
    console.error('donation intent error:', e)
  }
  // best-effort — never block the donor's path to payment
  return NextResponse.json({ ok: true })
}
