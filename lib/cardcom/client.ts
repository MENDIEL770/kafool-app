// CardCom API v11 (JSON) client — LowProfile hosted payment page + result lookup.
// Docs: https://secure.cardcom.solutions/api/v11/DOCS
// Auth lives in the request body (TerminalNumber + ApiName); ApiPassword only for
// refunds. There is no Authorization header.

const BASE = 'https://secure.cardcom.solutions/api/v11'

export interface CardcomCreds {
  terminal: number
  apiName: string
  apiPassword?: string
}

export interface LowProfileParams {
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly' | 'SuspendedDeal'
  amount: number
  coinId?: number            // 1 = ILS, 2 = USD
  language?: 'he' | 'en'
  productName?: string
  returnValue?: string       // our order id — echoed back in the result
  successRedirectUrl: string
  failedRedirectUrl: string
  webHookUrl: string
  name?: string
  email?: string
  phone?: string
  maxPayments?: number       // number-of-payments dropdown (installments)
  customFields?: { Id: number; Value: string }[]
}

export interface LowProfileResult {
  ResponseCode: number
  Description?: string
  LowProfileId?: string
  Url?: string
  UrlToBit?: string
  UrlToPayPal?: string
}

export interface LpResult {
  ResponseCode: number
  Description?: string
  TranzactionId?: number
  ReturnValue?: string
  Operation?: string
  TranzactionInfo?: {
    Amount?: number; CoinId?: number; ApprovalNumber?: string; Last4CardDigitsString?: string
    CardName?: string; Brand?: string; NumberOfPayments?: number
    UIValues?: { CardOwnerName?: string; CardOwnerEmail?: string; CardOwnerPhone?: string }
  }
  TokenInfo?: { Token?: string; TokenExDate?: string; CardYear?: string; CardMonth?: string }
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}

/** Create a hosted payment page. Returns the Url to load in an iframe. */
export async function createLowProfile(creds: CardcomCreds, p: LowProfileParams): Promise<LowProfileResult> {
  return post<LowProfileResult>('LowProfile/Create', {
    TerminalNumber: creds.terminal,
    ApiName: creds.apiName,
    Operation: p.operation || 'ChargeOnly',
    Amount: p.amount,
    ISOCoinId: p.coinId ?? 1,
    Language: p.language || 'he',
    ProductName: (p.productName || '').slice(0, 50) || undefined,
    ReturnValue: (p.returnValue || '').slice(0, 250) || undefined,
    SuccessRedirectUrl: p.successRedirectUrl,
    FailedRedirectUrl: p.failedRedirectUrl,
    WebHookUrl: p.webHookUrl,
    UIDefinition: {
      ...(p.name ? { CardOwnerNameValue: p.name } : {}),
      ...(p.email ? { CardOwnerEmailValue: p.email } : {}),
      ...(p.phone ? { CardOwnerPhoneValue: p.phone } : {}),
      ...(p.customFields?.length ? { CustomFields: p.customFields } : {}),
    },
    ...(p.maxPayments && p.maxPayments > 1 ? { AdvancedDefinition: { MaxNumOfPayments: p.maxPayments } } : {}),
  })
}

/** Source of truth: verify a transaction result by its LowProfileId. */
export async function getLpResult(creds: CardcomCreds, lowProfileId: string): Promise<LpResult> {
  return post<LpResult>('LowProfile/GetLpResult', {
    TerminalNumber: creds.terminal,
    ApiName: creds.apiName,
    LowProfileId: lowProfileId,
  })
}
