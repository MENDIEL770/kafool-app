// Lightweight client-side usage tracker for the public donation page.
// Fires events to /api/track via sendBeacon (reliable on unload/abandon).

let sid: string | null = null
function sessionId(): string {
  if (sid) return sid
  try {
    sid = localStorage.getItem('kafool_sid')
    if (!sid) { sid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)); localStorage.setItem('kafool_sid', sid) }
  } catch { sid = Math.random().toString(36).slice(2) }
  return sid!
}

export type TrackEvent =
  | 'view' | 'video_play' | 'donate_open' | 'donate_payment' | 'donate_complete' | 'donate_abandon'

export function track(campaignId: string, event: TrackEvent, opts?: { step?: string; meta?: Record<string, unknown> }) {
  if (typeof window === 'undefined' || !campaignId) return
  try {
    const body = JSON.stringify({ campaign_id: campaignId, session_id: sessionId(), event, step: opts?.step, meta: opts?.meta })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
  } catch { /* never let tracking break the page */ }
}

/** Fire an event only once per session (e.g. the page 'view'). */
export function trackOnce(campaignId: string, event: TrackEvent, opts?: { step?: string }) {
  try {
    const k = `kafool_t_${campaignId}_${event}`
    if (sessionStorage.getItem(k)) return
    sessionStorage.setItem(k, '1')
  } catch { /* ignore */ }
  track(campaignId, event, opts)
}
