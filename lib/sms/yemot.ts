/**
 * Yemot Hamashiach (ימות המשיח) SMS Integration
 * API Base: https://www.call2all.co.il/ym/api/
 * Auth: API KEY token (permanent, from "חומת האש" interface)
 */

const YEMOT_BASE = 'https://www.call2all.co.il/ym/api'

interface YemotResponse {
  responseStatus: 'OK' | 'ERROR' | 'FORBIDDEN' | 'EXCEPTION'
  message?: string
  messageCode?: number | null
  yemotAPIVersion?: number
}

interface LoginResponse extends YemotResponse {
  token?: string
}

interface SendSmsResponse extends YemotResponse {
  // responseStatus OK = success
}

interface SmsLogEntry {
  id: string
  phone: string
  message: string
  status: string
  sentTime: string
  units: number
}

interface GetSmsOutLogResponse extends YemotResponse {
  records?: SmsLogEntry[]
  totalCount?: number
}

// ─── Low-level API caller ─────────────────────────────────────────────────────

async function yemotCall<T extends YemotResponse>(
  command: string,
  params: Record<string, string | number | boolean>,
  apiKey: string
): Promise<T> {
  const url = new URL(`${YEMOT_BASE}/${command}`)

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      // Recommended: send token in Authorization header
      authorization: apiKey,
    },
    // 10 second timeout
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Yemot HTTP error: ${response.status}`)
  }

  const data = await response.json()
  return data as T
}

// ─── Public API functions ──────────────────────────────────────────────────────

/**
 * Login with username/password → returns temporary token (30 min TTL)
 * Prefer using API KEY instead for server-side usage.
 */
export async function yemotLogin(username: string, password: string): Promise<string> {
  const res = await fetch(
    `${YEMOT_BASE}/Login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  )
  const data: LoginResponse = await res.json()

  if (data.responseStatus !== 'OK' || !data.token) {
    throw new Error(data.message || 'Yemot login failed')
  }
  return data.token
}

/**
 * Send SMS via Yemot
 * @param apiKey - Permanent API KEY from "חומת האש"
 * @param phone - Recipient phone number (Israeli format: 0501234567)
 * @param message - SMS message text (Hebrew supported)
 */
export async function sendYemotSms(
  apiKey: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone: remove spaces, dashes
    const normalizedPhone = phone.replace(/[\s\-]/g, '')

    const res = await yemotCall<SendSmsResponse>(
      'SendSms',
      { phones: normalizedPhone, message },
      apiKey
    )

    if (res.responseStatus === 'OK') {
      return { success: true }
    }

    return {
      success: false,
      error: res.message || `Yemot error code: ${res.messageCode}`,
    }
  } catch (err) {
    return {
      success: false,
      error: String(err),
    }
  }
}

/**
 * Send SMS to multiple recipients
 */
export async function sendYemotSmsBulk(
  apiKey: string,
  phones: string[],
  message: string
): Promise<{ success: boolean; error?: string }> {
  const phoneList = phones.map(p => p.replace(/[\s\-]/g, '')).join(':')
  return sendYemotSms(apiKey, phoneList, message)
}

/**
 * Get outgoing SMS log
 */
export async function getYemotSmsLog(
  apiKey: string,
  options: { from?: number; limit?: number } = {}
): Promise<SmsLogEntry[]> {
  const res = await yemotCall<GetSmsOutLogResponse>(
    'GetSmsOutLog',
    { ...(options.from && { from: options.from }), ...(options.limit && { limit: options.limit }) },
    apiKey
  )

  if (res.responseStatus !== 'OK') {
    throw new Error(res.message || 'Failed to get SMS log')
  }

  return res.records || []
}

/**
 * Test API key validity
 */
export async function testYemotApiKey(apiKey: string): Promise<{
  valid: boolean
  systemName?: string
  units?: number
  error?: string
}> {
  try {
    const res = await yemotCall<YemotResponse & {
      name?: string
      units?: number
      username?: string
    }>('GetSession', {}, apiKey)

    if (res.responseStatus === 'OK') {
      return {
        valid: true,
        systemName: res.name,
        units: res.units,
      }
    }

    return { valid: false, error: res.message }
  } catch (err) {
    return { valid: false, error: String(err) }
  }
}
