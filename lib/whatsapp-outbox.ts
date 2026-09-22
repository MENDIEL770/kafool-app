// Per-org WhatsApp send throttle, to avoid a number getting flagged/blocked for
// firing many messages in a short burst.
//
// Normal (low) volume sends immediately — a donor's thank-you should feel
// instant. But once an org has sent a burst (BURST_CAP messages within
// BURST_WINDOW), or already has a backlog queued, further messages are written
// to the `whatsapp_outbox` table and sent later by the drain cron, which spaces
// them out (DRAIN_DELAY between messages from the same number).
//
// Everything degrades gracefully: if the outbox table isn't migrated yet, the
// queue checks/logs are skipped and messages simply send inline as before.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppMedia, whatsappEnabled, type WaConfig, type WaResult } from './whatsapp'
import { serviceActive, type WaService } from './whatsapp-service'

// How many messages an org may send inline within the window before we start
// queueing the rest (tunable via env without a redeploy of logic).
const BURST_CAP = Number(process.env.WHATSAPP_BURST_CAP || 5)
const BURST_WINDOW_MS = Number(process.env.WHATSAPP_BURST_WINDOW_SEC || 60) * 1000
// Spacing the drainer leaves between two messages from the same number.
const DRAIN_DELAY_MS = Number(process.env.WHATSAPP_DRAIN_DELAY_MS || 4000)
// Cap per org per drain run, and an overall wall-clock budget (< function timeout).
const DRAIN_PER_ORG = Number(process.env.WHATSAPP_DRAIN_PER_ORG || 12)
const RUN_BUDGET_MS = Number(process.env.WHATSAPP_DRAIN_BUDGET_MS || 50000)

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

type OutboxRow = {
  id: string
  org_id: string
  to_phone: string
  message: string
  media_url: string | null
  attempts: number
}

export interface QueueOrSendArgs {
  orgId: string
  to: string
  message: string
  mediaUrl?: string | null
  cfg?: WaConfig | null
}

// Is this org currently "busy" — has a queued backlog, or has already sent a
// burst within the window? If so, new messages should be queued rather than
// fired immediately. Throws only if the table is missing (caller falls back).
async function orgIsBusy(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  const pending = await supabase
    .from('whatsapp_outbox').select('id', { count: 'exact', head: true })
    .eq('org_id', orgId).eq('status', 'pending')
  if (pending.error) throw pending.error
  if ((pending.count ?? 0) > 0) return true

  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const recent = await supabase
    .from('whatsapp_outbox').select('id', { count: 'exact', head: true })
    .eq('org_id', orgId).eq('status', 'sent').gte('sent_at', since)
  if (recent.error) throw recent.error
  return (recent.count ?? 0) >= BURST_CAP
}

async function logSend(supabase: SupabaseClient, a: QueueOrSendArgs, r: WaResult): Promise<void> {
  try {
    await supabase.from('whatsapp_outbox').insert({
      org_id: a.orgId, to_phone: a.to, message: a.message, media_url: a.mediaUrl ?? null,
      status: r.success ? 'sent' : 'failed', sent_at: r.success ? new Date().toISOString() : null,
      error: r.success ? null : (r.error ?? null), attempts: 1,
    })
  } catch { /* table not migrated → skip logging */ }
}

/**
 * Send a WhatsApp message, throttled per org. Sends immediately when the org is
 * idle; queues (for the drain cron to space out) when it's in a burst. Always
 * best-effort — never throws.
 */
export async function queueOrSendWhatsApp(supabase: SupabaseClient, a: QueueOrSendArgs): Promise<void> {
  try {
    let busy = false
    try { busy = await orgIsBusy(supabase, a.orgId) }
    catch { busy = false } // table missing / query error → just send inline
    if (busy) {
      await supabase.from('whatsapp_outbox').insert({
        org_id: a.orgId, to_phone: a.to, message: a.message, media_url: a.mediaUrl ?? null, status: 'pending',
      })
      return
    }
    const r = await sendWhatsAppMedia(a.to, a.message, a.mediaUrl, a.cfg)
      .catch((e): WaResult => ({ success: false, error: String(e) }))
    await logSend(supabase, a, r)
  } catch (e) {
    // Last-ditch: never let throttling break a donation flow.
    console.error('queueOrSendWhatsApp error:', e)
    await sendWhatsAppMedia(a.to, a.message, a.mediaUrl, a.cfg).catch(() => {})
  }
}

async function markRow(supabase: SupabaseClient, id: string, status: 'sent' | 'failed', error: string | null, attempts: number) {
  try {
    await supabase.from('whatsapp_outbox').update({
      status, error, attempts, sent_at: status === 'sent' ? new Date().toISOString() : null,
    }).eq('id', id)
  } catch { /* ignore */ }
}

// Load an org's send config + whether it may currently send (connected + add-on on).
async function loadOrgSend(supabase: SupabaseClient, orgId: string): Promise<{ cfg: WaConfig; ok: boolean } | null> {
  try {
    const { data } = await supabase.from('organizations').select('whatsapp_config').eq('id', orgId).maybeSingle()
    const wc = (data as { whatsapp_config?: (WaConfig & { service?: WaService }) } | null)?.whatsapp_config || null
    return { cfg: wc || {}, ok: whatsappEnabled(wc) && serviceActive(wc?.service || null) }
  } catch { return null }
}

/**
 * Drain the queue: send pending messages, oldest first, spacing sends from the
 * same org by DRAIN_DELAY_MS. Bounded per org and by an overall time budget so
 * it fits inside a cron invocation; leftovers wait for the next run.
 */
export async function drainWhatsAppOutbox(supabase: SupabaseClient): Promise<{ sent: number; failed: number }> {
  const stats = { sent: 0, failed: 0 }
  let pending: OutboxRow[] = []
  try {
    const { data } = await supabase
      .from('whatsapp_outbox').select('id, org_id, to_phone, message, media_url, attempts')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(300)
    pending = (data as OutboxRow[]) || []
  } catch { return stats } // table not migrated
  if (!pending.length) return stats

  // Group by org, preserving arrival order within each.
  const byOrg = new Map<string, OutboxRow[]>()
  for (const row of pending) {
    const arr = byOrg.get(row.org_id) || []
    arr.push(row); byOrg.set(row.org_id, arr)
  }

  const startedAt = Date.now()
  for (const [orgId, rows] of byOrg) {
    const entry = await loadOrgSend(supabase, orgId)
    let sentForOrg = 0
    for (const row of rows) {
      if (Date.now() - startedAt > RUN_BUDGET_MS) return stats
      if (sentForOrg >= DRAIN_PER_ORG) break
      if (!entry || !entry.ok) {
        // Disconnected or add-on switched off — don't let it linger forever.
        await markRow(supabase, row.id, 'failed', 'whatsapp not active', row.attempts + 1)
        stats.failed++
        continue
      }
      const r = await sendWhatsAppMedia(row.to_phone, row.message, row.media_url, entry.cfg)
        .catch((e): WaResult => ({ success: false, error: String(e) }))
      await markRow(supabase, row.id, r.success ? 'sent' : 'failed', r.success ? null : (r.error ?? null), row.attempts + 1)
      if (r.success) stats.sent++; else stats.failed++
      sentForOrg++
      await sleep(DRAIN_DELAY_MS) // spacing to avoid a block
    }
  }
  return stats
}
