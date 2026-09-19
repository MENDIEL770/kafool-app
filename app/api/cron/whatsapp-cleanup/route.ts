import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { serviceActive, type WaService } from '@/lib/whatsapp-service'
import { getWhatsappSettings } from '@/lib/whatsapp-settings'
import { instanceLogout, partnerDeleteInstance, partnerEnabled } from '@/lib/whatsapp-greenapi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Auto-delete idle GreenAPI instances so managers aren't billed ($0.4/day while
// an instance exists) for a number they've stopped using. An instance is "idle"
// when the add-on isn't active and there's been no activity for N days
// (super-admin's idle_delete_days). Wire to a scheduler:
//   GET /api/cron/whatsapp-cleanup?key=<CRON_SECRET>
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
  const { idleDeleteDays } = await getWhatsappSettings(supabase)
  const cutoff = Date.now() - idleDeleteDays * 86_400_000

  let orgs: { id: string; whatsapp_config: Record<string, unknown> | null }[] = []
  try {
    const { data } = await supabase.from('organizations').select('id, whatsapp_config').not('whatsapp_config', 'is', null)
    orgs = (data || []) as typeof orgs
  } catch { return NextResponse.json({ ok: false, error: 'whatsapp_config not migrated' }) }

  let deleted = 0
  for (const org of orgs) {
    const cfg = org.whatsapp_config || {}
    const green = cfg.green as { id?: string; token?: string } | undefined
    if (!green?.id || !green?.token) continue
    const svc = cfg.service as WaService | undefined
    if (serviceActive(svc)) continue // in use — never touch

    // Last activity = latest of connected_at, service expiry, last completed period.
    const stamps = [cfg.connected_at as string | undefined, svc?.expires_at || undefined,
      ...(svc?.ledger || []).map(p => p.end)].filter(Boolean).map(s => Date.parse(s as string)).filter(n => !isNaN(n))
    const lastActivity = stamps.length ? Math.max(...stamps) : 0
    if (lastActivity && lastActivity > cutoff) continue // still within the idle window

    try {
      await instanceLogout(green.id, green.token)
      if (partnerEnabled()) await partnerDeleteInstance(green.id)
      await supabase.from('organizations').update({ whatsapp_config: { ...cfg, provider: null, green: null } }).eq('id', org.id)
      deleted++
    } catch { /* keep going */ }
  }

  return NextResponse.json({ ok: true, scanned: orgs.length, deleted, idleDeleteDays })
}
