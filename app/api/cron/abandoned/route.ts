import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyAbandonedIntents } from '@/lib/abandoned'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Sweep every active campaign for abandoned donations and SMS the managers.
 * The intent route already sweeps opportunistically on new payment attempts;
 * this is the safety net for campaigns with no further traffic. Wire it to any
 * scheduler (Vercel Cron or external):  GET /api/cron/abandoned?key=<CRON_SECRET>
 * If CRON_SECRET is unset the endpoint is open (fine for a manual trigger).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const key = new URL(req.url).searchParams.get('key')
    const auth = req.headers.get('authorization')
    if (key !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createServiceClient()
  const { data: camps } = await supabase.from('campaigns').select('id').eq('status', 'active')
  let notified = 0
  for (const c of camps || []) {
    try { notified += await notifyAbandonedIntents(supabase, c.id) } catch { /* keep going */ }
  }
  return NextResponse.json({ ok: true, campaigns: camps?.length || 0, notified })
}
