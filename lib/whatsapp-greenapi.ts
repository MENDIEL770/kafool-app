// GreenAPI partner + instance helpers, so a manager can connect WhatsApp entirely
// inside our dashboard (scan a QR we render) without ever visiting green-api.com.
//
// Requires a platform-level GREENAPI_PARTNER_TOKEN (one Kafool partner account).
// With it we create one GreenAPI instance per org on demand, then poll its QR +
// state. Without it, these are no-ops and the UI falls back to manual id/token.

const BASE = (process.env.GREENAPI_HOST || 'https://api.green-api.com').replace(/\/$/, '')

export function partnerEnabled(): boolean {
  return !!process.env.GREENAPI_PARTNER_TOKEN
}

/** Create a fresh GreenAPI instance via the partner API. */
export async function partnerCreateInstance(): Promise<{ id: string; token: string } | null> {
  const pt = process.env.GREENAPI_PARTNER_TOKEN
  if (!pt) return null
  try {
    const res = await fetch(`${BASE}/partner/createInstance/${pt}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kafool' }),
    })
    if (!res.ok) { console.error('greenapi createInstance:', res.status, await res.text().catch(() => '')); return null }
    const d = await res.json().catch(() => null) as { idInstance?: number | string; apiTokenInstance?: string } | null
    if (!d?.idInstance || !d?.apiTokenInstance) return null
    return { id: String(d.idInstance), token: String(d.apiTokenInstance) }
  } catch (e) { console.error('greenapi createInstance error:', e); return null }
}

// Harden a fresh instance to "send-only": disable every incoming/outgoing
// webhook so GreenAPI does not queue or expose the customer's conversations.
// We only ever call sendMessage — this makes that guarantee explicit at the
// instance level too. Best-effort (the instance reboots on settings change).
export async function instanceSetSendOnly(id: string, token: string): Promise<void> {
  try {
    await fetch(`${BASE}/waInstance${id}/setSettings/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incomingWebhook: 'no',
        pollMessageWebhook: 'no',
        stateWebhook: 'no',
        outgoingWebhook: 'no',
        outgoingMessageWebhook: 'no',
        outgoingAPIMessageWebhook: 'no',
        markIncomingMessagesReaded: 'no',
        keepOnlineStatus: 'no',
      }),
    })
  } catch (e) { console.error('greenapi setSettings error:', e) }
}

/** Delete an instance from the partner account (on disconnect). */
export async function partnerDeleteInstance(idInstance: string): Promise<void> {
  const pt = process.env.GREENAPI_PARTNER_TOKEN
  if (!pt) return
  try {
    await fetch(`${BASE}/partner/deleteInstanceAccount/${pt}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idInstance: Number(idInstance) || idInstance }),
    })
  } catch (e) { console.error('greenapi deleteInstance error:', e) }
}

/** authorized | notAuthorized | starting | yellowCard | blocked | unknown */
export async function instanceState(id: string, token: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/waInstance${id}/getStateInstance/${token}`)
    const d = await res.json().catch(() => null) as { stateInstance?: string } | null
    return d?.stateInstance || 'unknown'
  } catch { return 'unknown' }
}

/** Returns the current state and, when awaiting scan, a QR (base64 PNG).
 * Per GreenAPI: a fresh instance takes up to ~5 min to initialize; only once the
 * state is 'notAuthorized' should the QR be requested — other states mean it's
 * still starting up, so we return the state without a QR (the UI shows "preparing"). */
export async function instanceQr(id: string, token: string): Promise<{ state: string; qr?: string }> {
  const state = await instanceState(id, token)
  if (state === 'authorized') return { state }
  if (state !== 'notAuthorized') return { state } // still initializing — QR not ready yet
  try {
    const res = await fetch(`${BASE}/waInstance${id}/qr/${token}`)
    const d = await res.json().catch(() => null) as { type?: string; message?: string } | null
    if (d?.type === 'qrCode' && d?.message) return { state, qr: d.message }
    if (d?.type === 'alreadyLogged') return { state: 'authorized' }
    return { state }
  } catch { return { state } }
}

/** Log the number out of the instance (keeps the instance, drops the session). */
export async function instanceLogout(id: string, token: string): Promise<void> {
  try { await fetch(`${BASE}/waInstance${id}/logout/${token}`) } catch { /* ignore */ }
}
