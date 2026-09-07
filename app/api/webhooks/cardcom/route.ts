import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { webhookAuthorized } from '@/lib/webhook-auth'
import { recordCardcomDonation } from '@/lib/cardcom/record'

export const runtime = 'nodejs'

// CardCom posts here (server→server) after a transaction. We treat it only as a
// trigger and verify via GetLpResult (lib/cardcom/record). Always return 200 fast
// so CardCom doesn't retry.
export async function POST(req: NextRequest) {
  if (!webhookAuthorized(req)) return NextResponse.json({ ok: true })

  let body: Record<string, unknown> = {}
  try {
    const ct = req.headers.get('content-type') || ''
    const raw = await req.text()
    if (ct.includes('application/json')) body = JSON.parse(raw)
    else { try { body = JSON.parse(raw) } catch { new URLSearchParams(raw).forEach((v, k) => { body[k] = v }) } }
  } catch { return NextResponse.json({ ok: true }) }

  const lowProfileId = String(body.LowProfileId || body.LowProfileCode || body.lowprofilecode || '').trim()
  const returnValue = String(body.ReturnValue || body.returnvalue || '')
  const [campaignId, groupSlug] = returnValue.split('|')

  const supabase = await createServiceClient()
  // Log the raw call so we can see exactly what CardCom sends.
  let logId: string | null = null
  try {
    const { data } = await supabase.from('webhook_logs').insert({ source: 'cardcom', ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown', body }).select('id').single()
    logId = (data as { id?: string })?.id ?? null
  } catch { /* logging is best-effort */ }

  let note = 'cardcom: no lowProfileId'
  if (lowProfileId && campaignId) {
    try { note = await recordCardcomDonation(supabase, { lowProfileId, campaignId, groupSlug }) }
    catch (e) { note = `cardcom error: ${e instanceof Error ? e.message : String(e)}` }
  }
  console.log('CardCom webhook:', note)
  if (logId) { try { await supabase.from('webhook_logs').update({ note }).eq('id', logId) } catch { /* ignore */ } }

  return NextResponse.json({ ok: true })
}
