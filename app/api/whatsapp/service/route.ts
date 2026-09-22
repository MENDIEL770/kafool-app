import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activateService, deactivateService, serviceStatus, type WaService } from '@/lib/whatsapp-service'
import { instanceLogout, partnerDeleteInstance, partnerEnabled } from '@/lib/whatsapp-greenapi'
import { getWhatsappSettings } from '@/lib/whatsapp-settings'
import { isWhatsappPilot } from '@/lib/whatsapp-pilot'

async function loadOrg(req?: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return { error: NextResponse.json({ error: 'no org' }, { status: 400 }) }
  let config: Record<string, unknown> = {}
  try {
    const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    config = ((org as { whatsapp_config?: Record<string, unknown> } | null)?.whatsapp_config) || {}
  } catch { return { error: NextResponse.json({ error: 'הרץ תחילה את המיגרציה whatsapp_config' }, { status: 400 }) }
  }
  return { supabase, orgId, config }
}

// GET → current activation status + running usage/cost.
export async function GET() {
  const r = await loadOrg()
  if ('error' in r) return r.error
  return NextResponse.json(serviceStatus(r.config.service as WaService | undefined))
}

// POST { action: 'activate' | 'deactivate', days? } → toggle, preserving the
// rest of whatsapp_config (connection stays intact).
export async function POST(req: NextRequest) {
  const r = await loadOrg()
  if ('error' in r) return r.error
  const { supabase, orgId, config } = r
  const { action, days } = await req.json()
  // Activation is pilot-gated; deactivation is always allowed (so an org can
  // always turn off / stop billing).
  const settings = await getWhatsappSettings(supabase)
  if (action === 'activate' && (!settings.featureEnabled || !isWhatsappPilot(orgId, null))) {
    return NextResponse.json({ error: 'חיבור וואטסאפ אינו זמין כרגע.' }, { status: 403 })
  }
  const cur = (config.service as WaService | undefined) || null

  let service = action === 'activate'
    ? activateService(cur, Number(days) || 3)
    : action === 'deactivate'
      ? deactivateService(cur)
      : null
  if (!service) return NextResponse.json({ error: 'invalid action' }, { status: 400 })

  // Stamp the current platform daily price when turning on, so the invoice uses
  // the rate that was in effect at activation time.
  if (action === 'activate') {
    service = { ...service, daily_rate: settings.dailyRate }
  }

  let nextConfig: Record<string, unknown> = { ...config, service }
  // Turning OFF also deletes the GreenAPI instance so billing ($0.4/day while the
  // instance exists) stops immediately. The usage ledger is kept for the invoice;
  // reconnecting later just needs a fresh QR scan.
  if (action === 'deactivate') {
    const green = config.green as { id?: string; token?: string } | undefined
    if (green?.id && green?.token) {
      await instanceLogout(green.id, green.token)
      if (partnerEnabled()) await partnerDeleteInstance(green.id)
    }
    nextConfig = { ...nextConfig, provider: null, green: null }
  }
  const whatsapp_config = nextConfig
  const { error } = await supabase.from('organizations').update({ whatsapp_config }).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(serviceStatus(service))
}
