/**
 * Grow (formerly Meshulam / משולם) — Light Server API
 * Docs: https://grow-il.readme.io/  (light/server/1.0)
 *
 * Used for collecting the platform's own one-time *setup fee* from clients
 * (separate from the donor→org payments which go through Kesher).
 *
 * Credentials come from the platform's Grow account (env vars):
 *   GROW_PAGE_CODE   – the payment page code
 *   GROW_USER_ID     – the account user id
 *   GROW_API_KEY     – the API key
 *   GROW_ENV         – 'sandbox' | 'production'  (default: production)
 *
 * IMPORTANT: in the Grow dashboard, set the page's server callback (notify)
 * URL to:  https://kafool.com/api/webhooks/grow
 */

const BASES = {
  sandbox: 'https://sandbox.meshulam.co.il/api/light/server/1.0',
  production: 'https://secure.meshulam.co.il/api/light/server/1.0',
} as const

function growConfig() {
  const pageCode = process.env.GROW_PAGE_CODE
  const userId = process.env.GROW_USER_ID
  const apiKey = process.env.GROW_API_KEY
  const env = (process.env.GROW_ENV === 'sandbox' ? 'sandbox' : 'production') as keyof typeof BASES

  if (!pageCode || !userId || !apiKey) {
    throw new Error('Grow לא מוגדר — חסרים GROW_PAGE_CODE / GROW_USER_ID / GROW_API_KEY')
  }
  return { pageCode, userId, apiKey, base: BASES[env] }
}

export interface CreatePaymentArgs {
  /** our reference — the lead id; echoed back in the webhook as cField1 */
  ref: string
  /** amount in ₪ */
  sum: number
  description: string
  fullName?: string
  phone?: string
  email?: string
  /** where the payer is sent after success / cancel */
  successUrl: string
  cancelUrl: string
}

export interface CreatePaymentResult {
  ok: boolean
  url?: string
  processId?: string
  processToken?: string
  error?: string
}

/**
 * Create a Grow payment process and return the hosted iframe/redirect URL.
 */
export async function createGrowPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult> {
  let pageCode: string, userId: string, apiKey: string, base: string
  try {
    ({ pageCode, userId, apiKey, base } = growConfig())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  const params = new URLSearchParams()
  params.set('pageCode', pageCode)
  params.set('userId', userId)
  params.set('apiKey', apiKey)
  params.set('sum', String(args.sum))
  params.set('description', args.description)
  params.set('paymentNum', '1')
  params.set('successUrl', args.successUrl)
  params.set('cancelUrl', args.cancelUrl)
  params.set('cField1', args.ref)
  if (args.fullName) params.set('pageField[fullName]', args.fullName)
  if (args.phone) params.set('pageField[phone]', args.phone)
  if (args.email) params.set('pageField[email]', args.email)

  try {
    const res = await fetch(`${base}/createPaymentProcess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })

    const json: any = await res.json().catch(() => ({}))
    // Grow: status === 1 (or "1") = success
    const success = String(json?.status) === '1'

    if (!success) {
      const err = json?.err?.message || json?.err || json?.message || 'יצירת תשלום ב-Grow נכשלה'
      return { ok: false, error: typeof err === 'string' ? err : JSON.stringify(err) }
    }

    const data = json?.data ?? {}
    return {
      ok: true,
      url: data.url,
      processId: data.processId != null ? String(data.processId) : undefined,
      processToken: data.processToken != null ? String(data.processToken) : undefined,
    }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/**
 * Parse a Grow server callback (webhook) body into a normalized shape.
 * Grow may POST JSON or form-urlencoded with bracket notation
 * (e.g. data[transactionId], data[customFields][cField1]).
 */
export interface GrowWebhook {
  success: boolean
  ref: string | null            // our lead id (cField1)
  transactionId: string | null
  sum: number
  raw: Record<string, unknown>
}

export function parseGrowWebhook(raw: Record<string, unknown>): GrowWebhook {
  // form-urlencoded bracket keys are flattened; also support nested JSON `data`
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, any>

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (raw[k] != null && raw[k] !== '') return raw[k]
      if (data[k] != null && data[k] !== '') return data[k]
    }
    return undefined
  }

  // status: 1 / "1" / "success" = paid
  const statusRaw = pick('status', 'statusCode', 'data[status]', 'data[statusCode]')
  const success = String(statusRaw) === '1' || String(statusRaw).toLowerCase() === 'success'

  const ref =
    pick('cField1', 'customFields[cField1]', 'data[customFields][cField1]', 'data[cField1]') ?? null

  const transactionId =
    pick('transactionId', 'asmachta', 'data[transactionId]', 'data[asmachta]', 'transactionCode') ?? null

  const sum = Number(pick('sum', 'data[sum]', 'paymentSum') ?? 0)

  return {
    success,
    ref: ref != null ? String(ref) : null,
    transactionId: transactionId != null ? String(transactionId) : null,
    sum: isNaN(sum) ? 0 : sum,
    raw,
  }
}
