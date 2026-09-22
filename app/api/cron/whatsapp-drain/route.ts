import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { drainWhatsAppOutbox } from '@/lib/whatsapp-outbox'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Send queued WhatsApp messages with spacing between them, so an org that has a
// burst of donations doesn't fire dozens of messages at once and get its number
// blocked. Low-volume sends still go out instantly (see queueOrSendWhatsApp);
// only the overflow lands in the queue this drains. Wire to a scheduler ~every
// minute:  GET /api/cron/whatsapp-drain?key=<CRON_SECRET>
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
  const stats = await drainWhatsAppOutbox(supabase)
  return NextResponse.json({ ok: true, ...stats })
}
