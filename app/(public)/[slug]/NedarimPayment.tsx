'use client'

import { useEffect, useRef, useState } from 'react'

// Nedarim Plus embeds a card-input iframe and communicates via postMessage:
//   iframe → parent:  { Name: 'Height', Value }            (resize)
//                     { Name: 'TransactionResponse', Value } (result)
//   parent → iframe:  { Name: 'FinishTransaction2', Value } (charge with the
//                       card the donor typed in the iframe)
// On success Nedarim also POSTs its server CallBack to our webhook, which is
// what actually records the donation (routed by Param1 = campaign id).
const NEDARIM_IFRAME = 'https://www.matara.pro/nedarimplus/iframe'
const CALLBACK_URL = 'https://www.kafool.com/api/webhooks/nedarim'

interface Props {
  mosad: string
  apiValid: string
  amount: number        // per-month for הו"ק, full amount for חד"פ
  tashlumim: number     // months for הו"ק
  isHok: boolean
  donor: { firstName: string; lastName: string; phone: string; email: string }
  comment?: string
  campaignId: string
  groupSlug?: string
  slug: string
  primaryColor: string
  buttonRadius: string
  lang?: 'he' | 'en'
  onBack: () => void
}

export default function NedarimPayment({
  mosad, apiValid, amount, tashlumim, isHok, donor, comment,
  campaignId, groupSlug, slug, primaryColor, buttonRadius, lang = 'he', onBack,
}: Props) {
  const en = lang === 'en'
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(360)
  const [status, setStatus] = useState<'idle' | 'paying' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const total = isHok ? amount * tashlumim : amount

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data
      if (!d || typeof d !== 'object') return
      // helps verify the exact protocol against a real transaction
      console.log('Nedarim iframe message:', d)

      if (d.Name === 'Height' && d.Value) {
        setHeight(Number(d.Value) + 20)
      }
      if (d.Name === 'TransactionResponse') {
        const v = d.Value || {}
        // STRICT success: Nedarim must explicitly report OK/Success AND return a
        // real transaction/approval id. A declined charge can still carry a
        // TransactionId, so presence-of-id alone is NOT success — otherwise the
        // donor gets a thank-you for a payment that never went through. Never
        // fabricate an id: no real id ⇒ treat as failure.
        const statusStr = String(v.Status ?? v.status ?? '').trim().toLowerCase()
        const realTxnId = String(v.TransactionId || v.Confirmation || v.ConfirmationNumber || v.Asmachta || '').trim()
        const explicitOk = statusStr === 'ok' || statusStr === 'success' || statusStr === 'true'
        const explicitFail = statusStr !== '' && !explicitOk // any other non-empty status = failure/decline
        const ok = !explicitFail && !!realTxnId
        if (ok) {
          // Record the donation from the client as a reliable backstop to the
          // server CallBack (idempotent — both dedupe on the transaction id),
          // then show the thank-you page.
          const transactionId = realTxnId
          ;(async () => {
            try {
              await fetch('/api/donations/nedarim-record', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId, groupSlug, amount, isHok, months: tashlumim, donor, comment, transactionId }),
              })
            } catch { /* webhook will still record if configured */ }
            window.location.href = `/${slug}/thanks`
          })()
        } else {
          setStatus('error')
          setError(v.Message || v.message || (en ? 'Payment was not completed — please try again' : 'התשלום לא הושלם — נסו שוב'))
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [slug])

  function pay() {
    setStatus('paying')
    setError(null)
    frameRef.current?.contentWindow?.postMessage({
      Name: 'FinishTransaction2',
      Value: {
        Mosad: mosad,
        ApiValid: apiValid,
        PaymentType: isHok ? 'HK' : 'Ragil',
        Amount: String(amount),
        Tashlumim: String(isHok ? tashlumim : 1),
        Currency: '1', // 1 = ILS
        Zeout: '',
        FirstName: donor.firstName,
        LastName: donor.lastName,
        Street: '',
        City: '',
        Phone: donor.phone,
        Mail: donor.email,
        Groupe: '',
        Comment: comment || '',
        Param1: campaignId,      // routing: webhook attaches the donation here
        Param2: groupSlug || '',
        CallBack: CALLBACK_URL,
        CallBackMailError: '',
        ForceUpdateMatching: '1',
      },
    }, '*')
  }

  return (
    <div className="flex flex-col">
      <iframe
        ref={frameRef}
        src={`${NEDARIM_IFRAME}?Mosad=${encodeURIComponent(mosad)}`}
        style={{ width: '100%', height, border: 'none' }}
        title={en ? 'Secure payment — Nedarim Plus' : 'תשלום מאובטח — נדרים פלוס'}
        allow="payment"
      />

      {error && <p className="px-5 text-center text-sm text-red-600 mt-2">{error}</p>}

      <div className="px-5 py-4 space-y-2">
        <button
          onClick={pay}
          disabled={status === 'paying'}
          className={`w-full py-4 font-black text-white disabled:opacity-50 transition-all ${buttonRadius}`}
          style={{ backgroundColor: primaryColor }}
        >
          {status === 'paying'
            ? (en ? 'Processing payment...' : 'מעבד תשלום...')
            : <span className="flex items-center justify-center gap-2">
                <span className="text-sm font-bold opacity-90">{isHok ? (en ? 'Confirm monthly donation' : 'אשר הוראת קבע') : (en ? 'Pay' : 'שלם')}</span>
                {total > 0 && <span className="text-xl font-black">₪{total.toLocaleString()}</span>}
              </span>}
        </button>
        <button onClick={onBack} className="w-full text-xs text-gray-400 hover:text-gray-600">
          {en ? '← Back to details' : '← חזרה לפרטים'}
        </button>
        <p className="text-center text-xs text-gray-400">{en ? 'Secure payment — Nedarim Plus' : 'תשלום מאובטח — נדרים פלוס'}</p>
      </div>
    </div>
  )
}
