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

/** Israeli/local number → WhatsApp E.164 digits (no +). 0501234567 → 972501234567. */
export function toWaNumber(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

/** The active provider (explicit env wins, else auto-detected), or null. */
export function whatsappProvider(): WaProvider | null {
  const explicit = (process.env.WHATSAPP_PROVIDER || '').toLowerCase()
  if (explicit === 'green' || explicit === 'ultramsg' || explicit === 'meta') return explicit
  if (process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_API_TOKEN) return 'green'
  if (process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN) return 'ultramsg'
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return 'meta'
  return null
}

export function whatsappEnabled(): boolean {
  return whatsappProvider() !== null
}

/**
 * Send a free-text WhatsApp message. Works with the QR providers (green /
 * ultramsg). The official Meta API cannot send arbitrary free text to a user
 * outside a 24h service window, so on `meta` this returns an error — use
 * sendWhatsAppTemplate there instead.
 */
export async function sendWhatsAppText(to: string, message: string): Promise<WaResult> {
  const provider = whatsappProvider()
  if (!provider) return { success: false, error: 'not configured' }
  const wa = toWaNumber(to)
  if (wa.length < 11) return { success: false, error: 'invalid phone' }

  try {
    if (provider === 'green') {
      const host = (process.env.GREENAPI_HOST || 'https://api.green-api.com').replace(/\/$/, '')
      const id = process.env.GREENAPI_ID_INSTANCE!
      const token = process.env.GREENAPI_API_TOKEN!
      const res = await fetch(`${host}/waInstance${id}/sendMessage/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${wa}@c.us`, message }),
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${await res.text().catch(() => '')}` }
      return { success: true }
    }

    if (provider === 'ultramsg') {
      const instance = process.env.ULTRAMSG_INSTANCE!
      const token = process.env.ULTRAMSG_TOKEN!
      const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, to: wa, body: message }),
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
