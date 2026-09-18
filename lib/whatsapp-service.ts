// WhatsApp sending as a metered add-on. A manager turns it ON for their campaign
// period (with an auto-off timer), turns it OFF at the end, and the system counts
// the active days and computes what they owe. Stored inside
// organizations.whatsapp_config.service.

export interface WaServicePeriod { start: string; end: string }
export interface WaService {
  active?: boolean
  current_start?: string | null   // start of the open (currently-active) period
  expires_at?: string | null      // auto-off time
  ledger?: WaServicePeriod[]       // completed billable periods
  daily_rate?: number             // ₪ per active day (else platform default)
}

const DAY = 86_400_000

/** Platform default daily price for the add-on (₪), overridable via env. */
export function defaultDailyRate(): number {
  return Number(process.env.WHATSAPP_DAILY_RATE) || 20
}

/** Is sending currently active (on, and not past its auto-off time)? */
export function serviceActive(s?: WaService | null, now = Date.now()): boolean {
  if (!s?.active) return false
  if (s.expires_at && now >= Date.parse(s.expires_at)) return false
  return true
}

/** Total billable days + cost so far (completed periods + the open one). */
export function serviceBilling(s?: WaService | null, now = Date.now()): { days: number; rate: number; cost: number } {
  const rate = s?.daily_rate ?? defaultDailyRate()
  let days = 0
  for (const p of s?.ledger || []) {
    const d = Math.ceil((Date.parse(p.end) - Date.parse(p.start)) / DAY)
    if (d > 0) days += d
  }
  if (s?.active && s.current_start) {
    const capped = s.expires_at && now >= Date.parse(s.expires_at) ? Date.parse(s.expires_at) : now
    const d = Math.ceil((capped - Date.parse(s.current_start)) / DAY)
    if (d > 0) days += d
  }
  return { days, rate, cost: days * rate }
}

/** Turn sending ON for `days` (extends the window if already active). */
export function activateService(s: WaService | null | undefined, days: number, now = Date.now()): WaService {
  const cur: WaService = s || {}
  const expires = new Date(now + Math.max(1, Math.round(days)) * DAY).toISOString()
  if (cur.active && cur.current_start) return { ...cur, expires_at: expires }
  return { ...cur, active: true, current_start: new Date(now).toISOString(), expires_at: expires, ledger: cur.ledger || [] }
}

/** Turn sending OFF and close the open period into the billing ledger. */
export function deactivateService(s: WaService | null | undefined, now = Date.now()): WaService {
  const cur: WaService = s || {}
  const ledger = [...(cur.ledger || [])]
  if (cur.active && cur.current_start) {
    const end = cur.expires_at && now >= Date.parse(cur.expires_at) ? cur.expires_at : new Date(now).toISOString()
    ledger.push({ start: cur.current_start, end })
  }
  return { ...cur, active: false, current_start: null, expires_at: null, ledger }
}

/** A view for the UI/status endpoint. */
export function serviceStatus(s?: WaService | null, now = Date.now()) {
  const active = serviceActive(s, now)
  const { days, rate, cost } = serviceBilling(s, now)
  return { active, expiresAt: active ? s?.expires_at ?? null : null, days, rate, cost }
}
