// WhatsApp Business Cloud API (Meta) sender. No-op (returns false) until
// WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set, so the app keeps working
// until WhatsApp is configured. Business-initiated messages (thank-you,
// reminders) MUST use a template that Meta has approved — free text is only
// allowed inside a 24h customer-service window, which we don't have here.
const GRAPH_VERSION = 'v21.0'

/** Israeli/local number → WhatsApp E.164 digits (no +). 0501234567 → 972501234567. */
function toWaNumber(phone: string): string {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

/**
 * Send an approved WhatsApp template. `bodyParams` fill the template body's
 * {{1}}, {{2}}… placeholders in order. Returns whether it was sent.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = [],
  languageCode = 'he',
): Promise<{ success: boolean; error?: string }> {
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
