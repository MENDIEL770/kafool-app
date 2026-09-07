import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { recordCardcomDonation } from '@/lib/cardcom/record'

export const runtime = 'nodejs'

// Called from the /thanks page (with the LowProfileId the modal stashed) to
// confirm + record the CardCom donation — a fast, idempotent backstop to the
// webhook so the donor sees confirmation even if the webhook lags.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const lowProfileId = String(b.lowProfileId || '').trim()
  const campaignId = String(b.campaignId || '').trim()
  const groupSlug = String(b.groupSlug || '').trim()
  if (!lowProfileId || !campaignId) return NextResponse.json({ confirmed: false })

  const supabase = await createServiceClient()
  const note = await recordCardcomDonation(supabase, { lowProfileId, campaignId, groupSlug }).catch(() => 'error')
  const confirmed = /recorded|duplicate/.test(note)
  return NextResponse.json({ confirmed, note })
}
