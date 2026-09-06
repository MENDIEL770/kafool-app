import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Delete a single abandoned lead (a donation_intent). Gated to the campaign's
// owner: RLS lets a user read only their own campaign (super-admin any), so a
// successful campaign read authorizes the delete. The intent itself is
// RLS-locked, so the removal runs on the service client, scoped to that campaign.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { campaignId, intentId } = await req.json().catch(() => ({}))
  if (!campaignId || !intentId) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const { data: camp } = await supabase.from('campaigns').select('id').eq('id', campaignId).maybeSingle()
  if (!camp) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = await createServiceClient()
  const { error } = await admin.from('donation_intents').delete().eq('id', intentId).eq('campaign_id', campaignId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
