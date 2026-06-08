import crypto from 'crypto'
import { decodeAddActionData } from './iframe'

// KesherStatus codes that indicate successful payment
const SUCCESS_STATUSES = [4, 11]

export interface KesherWebhookPayload {
  Transaction?: {
    NumTransaction?: string
    KesherStatus?: number
    Sum?: number
    TransactionType?: string
    Comment1?: string
    Comment2?: string
    Details?: string
    OKNum?: string        // approval number from credit company
    CardMumber?: string   // last 4 digits
    ExpairyDate?: string
    adddata?: string      // our addactiondata comes back here
    ReceiptName?: string
    ReceiptFor?: string
    TransactionDate?: string
    Currency?: number
    NumPayments?: number
    FirstPayment?: number
  }
  Customer?: {
    FirstName?: string
    LastName?: string
    ClientRef?: string
    ClientDynamicFields?: unknown[]
  }
  Obligation?: {
    ObligationReference?: string
    ObligationStatus?: number
    ObligationApiIdentity?: string
  }
  // Legacy flat format (some Kesher versions send flat JSON)
  NumTransaction?: string
  KesherStatus?: number
  Amount?: number
  FirstName?: string
  LastName?: string
  Email?: string
  PhoneNumber?: string
  Dedication?: string
  adddata?: string
}

export interface ParsedDonation {
  transactionId: string
  kesherStatus: number
  amount: number
  donorName: string | null
  donorPhone: string | null
  donorEmail: string | null
  campaignId: string | null
  groupSlug: string | null
  callerId: string | null
  dedication: string | null
  approvalNumber: string | null
  currency: number
}

export function isSuccessfulPayment(payload: KesherWebhookPayload): boolean {
  const status = payload.Transaction?.KesherStatus ?? payload.KesherStatus
  return SUCCESS_STATUSES.includes(Number(status))
}

export function parseKesherPayload(payload: KesherWebhookPayload): ParsedDonation {
  const txn = payload.Transaction
  const customer = payload.Customer

  const transactionId = String(txn?.NumTransaction || payload.NumTransaction || '')
  const kesherStatus = Number(txn?.KesherStatus ?? payload.KesherStatus ?? 0)
  const amount = Number(txn?.Sum ?? payload.Amount ?? 0)
  const approvalNumber = txn?.OKNum || null

  // Donor name: from Customer object or flat fields
  const firstName = customer?.FirstName || payload.FirstName || ''
  const lastName = customer?.LastName || payload.LastName || ''
  const donorName = [firstName, lastName].filter(Boolean).join(' ') || null

  const donorPhone = payload.PhoneNumber || null
  const donorEmail = payload.Email || null
  const currency = txn?.Currency ?? 1  // default ILS

  // Decode our campaign metadata from adddata
  const adddata = txn?.adddata || payload.adddata || ''
  const { campaignId, groupSlug, callerId, dedication } = decodeAddActionData(adddata)

  // Also check legacy fields
  const finalDedication = dedication || payload.Dedication || txn?.Comment1 || null

  return {
    transactionId,
    kesherStatus,
    amount,
    donorName,
    donorPhone,
    donorEmail,
    campaignId: campaignId || null,
    groupSlug: groupSlug || null,
    callerId: callerId || null,
    dedication: finalDedication,
    approvalNumber,
    currency,
  }
}

export function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return true  // skip if not configured
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase(), 'hex'),
      Buffer.from(expected.toLowerCase(), 'hex')
    )
  } catch {
    return false
  }
}
