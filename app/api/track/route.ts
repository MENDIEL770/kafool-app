import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Records a public donation-page usage event. Called via sendBeacon/fetch from
// lib/track.ts — kept lightweight (no auth; the campaign_id FK rejects junk).
const VALID = new Set(['view', 'video_play', 'donate_open', 'donate_payment', 'donate_complete', 'donate_abandon'])

export async function POST(req: NextRequest) {
  try {
    // A visit fires several events; 200/min per IP is well above real usage and
    // stops a scripted flood from bloating the analytics table.
    if (!rateLimit(`track:${clientIp(req)}`, 200, 60_000)) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }
    const { campaign_id, session_id, event, step, meta } = await req.json().catch(() => ({}))
    if (!campaign_id || !session_id || !VALID.has(event)) return NextResponse.json({ ok: false }, { status: 400 })
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await admin.from('campaign_events').insert({
      campaign_id,
      session_id: String(session_id).slice(0, 64),
      event_type: event,
      step: step ? String(step).slice(0, 32) : null,
      meta: meta && typeof meta === 'object' ? meta : null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
