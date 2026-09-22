import { createClient } from '@/lib/supabase/server'
export { encryptPassword, decryptPassword } from './crypto'

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

/* ─── Encryption (re-exported from crypto.ts) ─── */
import { decryptPassword } from './crypto'

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

/* ─── CreditTransaction (זיכוי / refund of a credit-card transaction) ─── */
export interface KesherRefundResult { success: boolean; code?: number; description?: string; error?: string }

/**
 * Refund (credit) a Kesher credit-card transaction by its original transaction
 * number. Uses the org's full-API credentials; requires them (the legacy static
 * link mode can't refund via API — do it in the Kesher dashboard).
 */
export async function refundKesherTransaction(campaignId: string, transactionNum: string): Promise<KesherRefundResult> {
  const credentials = await getKesherCredentials(campaignId)
  if (!credentials) return { success: false, error: 'לא נמצאו פרטי חיבור לקשר עבור קמפיין זה.' }
  if (!credentials.username) return { success: false, error: 'זיכוי אוטומטי דורש חיבור API מלא לקשר. בצעו את הזיכוי בממשק קשר.' }
  try {
    const r = await callKesher(credentials, 'CreditTransaction', { transactionNum: String(transactionNum) }) as Record<string, unknown>
    const rr = (r?.RequestResult as Record<string, unknown>) || r
    const code = (rr?.Code ?? r?.Code) as number | undefined
    const status = rr?.Status === true || r?.Status === true || code === 0
    const description = String(rr?.Description || r?.Description || '')
    return status ? { success: true, code, description } : { success: false, code, description, error: description || 'הזיכוי נדחה על ידי קשר' }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
