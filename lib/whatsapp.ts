// Provider-agnostic WhatsApp sender.
//
// Two kinds of provider are supported so we can start now with a number you
// already own and later swap to the official API with zero code changes:
//   • green / ultramsg — QR providers: scan a QR with an existing WhatsApp
//     number and send FREE TEXT immediately (no template approval). Best for
//     getting started.
//   • meta — the official WhatsApp Business Cloud API: reliable, but business-
//     initiated messages must use a pre-approved TEMPLATE.
//
// The active provider is chosen by WHATSAPP_PROVIDER, or auto-detected from
// whichever credentials are present. Everything is a no-op (returns success:
// false) until one is configured, so the app keeps working meanwhile.

const GRAPH_VERSION = 'v21.0'

export type WaProvider = 'green' | 'ultramsg' | 'meta'
export interface WaResult { success: boolean; error?: string }

// Per-organization WhatsApp config (stored in organizations.whatsapp_config).
// Any org may connect its own number; when absent we fall back to the platform
// env config, so one shared number still works too.
export interface WaConfig {
  provider?: WaProvider | null
  green?: { id?: string; token?: string; host?: string } | null
  ultramsg?: { instance?: string; token?: string } | null
  meta?: { token?: string; phoneId?: string } | null
}

type Resolved =
  | { provider: 'green'; id: string; token: string; host: string }
  | { provider: 'ultramsg'; instance: string; token: string }
  | { provider: 'meta'; token: string; phoneId: string }

/** Israeli/local number → WhatsApp E.164 digits (no +). 0501234567 → 972501234567. */
export function toWaNumber(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

// Resolve a concrete provider + credentials: the org's own config wins; else the
// platform env. Only returns a provider whose required credentials are present.
function resolve(cfg?: WaConfig | null): Resolved | null {
  if (cfg) {
    const p = (cfg.provider || '').toLowerCase()
    if ((p === 'green' || (!p && cfg.green)) && cfg.green?.id && cfg.green?.token)
      return { provider: 'green', id: cfg.green.id, token: cfg.green.token, host: (cfg.green.host || 'https://api.green-api.com').replace(/\/$/, '') }
    if ((p === 'ultramsg' || (!p && cfg.ultramsg)) && cfg.ultramsg?.instance && cfg.ultramsg?.token)
      return { provider: 'ultramsg', instance: cfg.ultramsg.instance, token: cfg.ultramsg.token }
    if ((p === 'meta' || (!p && cfg.meta)) && cfg.meta?.token && cfg.meta?.phoneId)
      return { provider: 'meta', token: cfg.meta.token, phoneId: cfg.meta.phoneId }
  }
  // Platform env fallback.
  const explicit = (process.env.WHATSAPP_PROVIDER || '').toLowerCase()
  if ((explicit === 'green' || !explicit) && process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_API_TOKEN)
    return { provider: 'green', id: process.env.GREENAPI_ID_INSTANCE, token: process.env.GREENAPI_API_TOKEN, host: (process.env.GREENAPI_HOST || 'https://api.green-api.com').replace(/\/$/, '') }
  if ((explicit === 'ultramsg' || !explicit) && process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN)
    return { provider: 'ultramsg', instance: process.env.ULTRAMSG_INSTANCE, token: process.env.ULTRAMSG_TOKEN }
  if ((explicit === 'meta' || !explicit) && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
    return { provider: 'meta', token: process.env.WHATSAPP_TOKEN, phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID }
  return null
}

/** The active provider for this config (org, else env), or null. */
export function whatsappProvider(cfg?: WaConfig | null): WaProvider | null {
  return resolve(cfg)?.provider ?? null
}

export function whatsappEnabled(cfg?: WaConfig | null): boolean {
  return resolve(cfg) !== null
}

/**
 * Send a free-text WhatsApp message via the resolved provider (org config first,
 * else platform env). Works with the QR providers (green / ultramsg). The
 * official Meta API can't send arbitrary free text outside a 24h window, so on
 * `meta` this returns an error — use sendWhatsAppTemplate there instead.
 */
export async function sendWhatsAppText(to: string, message: string, cfg?: WaConfig | null): Promise<WaResult> {
  const r = resolve(cfg)
  if (!r) return { success: false, error: 'not configured' }
  const wa = toWaNumber(to)
  if (wa.length < 11) return { success: false, error: 'invalid phone' }

  try {
    if (r.provider === 'green') {
      const res = await fetch(`${r.host}/waInstance${r.id}/sendMessage/${r.token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${wa}@c.us`, message }),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${await res.text().catch(() => '')}` }
      return { success: true }
    }

    if (r.provider === 'ultramsg') {
      const res = await fetch(`https://api.ultramsg.com/${r.instance}/messages/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: r.token, to: wa, body: message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || (data as { error?: string }).error) return { success: false, error: (data as { error?: string }).error || `HTTP ${res.status}` }
      return { success: true }
    }

    // meta: no free-text outside a service window
    return { success: false, error: 'meta provider is template-only — use sendWhatsAppTemplate' }
  } catch (e) {
    console.error('sendWhatsAppText error:', e)
    return { success: false, error: String(e) }
  }
}

/**
 * Send an approved WhatsApp TEMPLATE via the official Meta Cloud API.
 * `bodyParams` fill the template body's {{1}}, {{2}}… in order.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = [],
  languageCode = 'he',
): Promise<WaResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return { success: false, error: 'not configured' }
  const wa = toWaNumber(to)
  if (wa.length < 11) return { success: false, error: 'invalid phone' }

  const payload = {
    messaging_product: 'whatsapp',
    to: wa,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(bodyParams.length
        ? { components: [{ type: 'body', parameters: bodyParams.map(t => ({ type: 'text', text: String(t) })) }] }
        : {}),
    },
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error('WhatsApp send error:', res.status, await res.text().catch(() => ''))
      return { success: false, error: `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    console.error('sendWhatsAppTemplate error:', e)
    return { success: false, error: String(e) }
  }
}
