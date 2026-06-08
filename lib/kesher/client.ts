import { createClient } from '@/lib/supabase/server'

/* ─── Types ─── */
export interface KesherCredentials {
  username: string
  passwordDecrypted: string
  projectNumber: string
  paymentPageId: number
  orgId: string
}

export interface GetLinkTokenParams {
  amountAgorot: number          // באגורות — מחולק ל-100 לפני שליחה לקשר
  donorFirstName?: string
  donorLastName?: string
  donorEmail?: string
  donorPhone?: string
  paymentType: 'one_time' | 'recurring'
  numPayments?: number
  donationId: string            // חוזר בתור adddata מקשר
  successUrl: string
  failedUrl: string
}

export interface GetLinkTokenResponse {
  token: string
  iframeUrl: string
}

/* ─── Encryption helpers ─── */
const ENC_KEY = process.env.KESHER_ENCRYPTION_KEY || 'kafool-default-key-32chars-padded'

export function encryptPassword(plain: string): string {
  // Simple base64 + key XOR — in production use AES-GCM via crypto.subtle
  const key = ENC_KEY.slice(0, 32).padEnd(32, '0')
  const buf = Buffer.from(plain, 'utf8')
  const keyBuf = Buffer.from(key, 'utf8')
  const xored = buf.map((b, i) => b ^ keyBuf[i % keyBuf.length])
  return Buffer.from(xored).toString('base64')
}

export function decryptPassword(encrypted: string): string {
  const key = ENC_KEY.slice(0, 32).padEnd(32, '0')
  const buf = Buffer.from(encrypted, 'base64')
  const keyBuf = Buffer.from(key, 'utf8')
  const xored = buf.map((b, i) => b ^ keyBuf[i % keyBuf.length])
  return Buffer.from(xored).toString('utf8')
}

/* ─── Get credentials from DB ─── */
export async function getKesherCredentials(campaignId: string): Promise<KesherCredentials | null> {
  const supabase = await createClient()

  // Get org_id from campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('org_id')
    .eq('id', campaignId)
    .single()

  if (!campaign?.org_id) return null

  // Try kesher_connections first (new approach)
  const { data: conn } = await supabase
    .from('kesher_connections')
    .select('*')
    .eq('org_id', campaign.org_id)
    .eq('is_active', true)
    .single()

  if (conn) {
    return {
      username: conn.kesher_username,
      passwordDecrypted: decryptPassword(conn.kesher_password_encrypted),
      projectNumber: conn.project_number,
      paymentPageId: conn.payment_page_id,
      orgId: campaign.org_id,
    }
  }

  // Fallback: org-level settings (legacy)
  const { data: org } = await supabase
    .from('organizations')
    .select('kesher_page_id, kesher_active, id')
    .eq('id', campaign.org_id)
    .single()

  if (!org?.kesher_page_id || !org.kesher_active) return null

  return {
    username: '',
    passwordDecrypted: '',
    projectNumber: '',
    paymentPageId: Number(org.kesher_page_id),
    orgId: campaign.org_id,
  }
}

/* ─── Generic Kesher API caller ─── */
async function callKesher(credentials: KesherCredentials, func: string, payload: Record<string, unknown>) {
  const KESHER_BASE_URL = process.env.KESHER_BASE_URL || 'https://kesherhk.info/ConnectToKesher/ConnectToKesher'

  const body = JSON.stringify({
    Json: {
      func,
      userName: credentials.username,
      password: credentials.passwordDecrypted,
      ...payload,
    },
    format: 'json',
  })

  const res = await fetch(KESHER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body,
  })

  if (!res.ok) throw new Error(`Kesher API error: ${res.status}`)
  return res.json()
}

/* ─── GetLinkToken ─── */
export async function getLinkToken(
  credentials: KesherCredentials,
  params: GetLinkTokenParams
): Promise<GetLinkTokenResponse> {
  const KESHER_PAYMENT_BASE_URL = process.env.KESHER_PAYMENT_BASE_URL || 'https://kesherhk.info'

  // קשר מצפה לשקלים בשדה Total (לא אגורות)
  const amountShekels = params.amountAgorot / 100

  const payload: Record<string, unknown> = {
    'PaymentPageId.request': credentials.paymentPageId,
    'Total.request': amountShekels,
    'Currency.request': 1,  // ILS
    'addactiondata.request': params.donationId,
    'successUrl.request': params.successUrl,
    'failedUrl.request': params.failedUrl,
  }

  if (params.donorFirstName) payload['FirstName.request'] = params.donorFirstName
  if (params.donorLastName) payload['LastName.request'] = params.donorLastName
  if (params.donorEmail) payload['Mail.request'] = params.donorEmail
  if (params.donorPhone) payload['Phone.request'] = params.donorPhone

  if (params.paymentType === 'recurring' && params.numPayments) {
    payload['NumPayments.request'] = params.numPayments
    payload['PaymentType.request'] = 'Payments'
  }

  let token: string

  if (credentials.username) {
    // Full API mode — get token from Kesher
    const response = await callKesher(credentials, 'GetLinkToken', payload)
    token = response?.Token || response?.token || ''
    if (!token) throw new Error('לא התקבל token מקשר')
  } else {
    // Legacy mode — build static URL (fallback)
    token = ''
  }

  const iframeUrl = token
    ? `${KESHER_PAYMENT_BASE_URL}/PaymentPage?id=${credentials.paymentPageId}&token=${token}`
    : `${KESHER_PAYMENT_BASE_URL}/PaymentPage/PaymentPage?id=${credentials.paymentPageId}&addactiondata=${params.donationId}&total=${amountShekels}`

  return { token, iframeUrl }
}
