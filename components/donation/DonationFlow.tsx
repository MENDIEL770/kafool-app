'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, AlertCircle, RotateCcw, ExternalLink, Loader2 } from 'lucide-react'

/* ─── Types ─── */
type FlowState = 'select' | 'iframe' | 'success' | 'error'
type PaymentType = 'one_time' | 'recurring'
type PaymentStatus = 'pending' | 'success' | 'failed'

interface Props {
  campaignId: string
  campaignSlug: string
  primaryColor?: string
  donationAmounts?: number[]
}

/* ─── Polling hook ─── */
function usePaymentStatus(donationId: string | null) {
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [data, setData] = useState<{ receiptLink?: string; donorName?: string; amount?: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!donationId) return

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?donationId=${donationId}`)
        const json = await res.json()
        if (json.status && json.status !== 'pending') {
          setStatus(json.status)
          setData({ receiptLink: json.receiptLink, donorName: json.donorName, amount: json.amount })
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        // continue polling
      }
    }, 2000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [donationId])

  return { status, data }
}

/* ─── Amount Selector ─── */
function AmountSelector({
  amounts,
  primaryColor,
  onSubmit,
}: {
  amounts: number[]
  primaryColor: string
  onSubmit: (params: {
    amount: number
    paymentType: PaymentType
    numPayments: number
    donorName: string
    donorEmail: string
    donorPhone: string
    dedication: string
  }) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('one_time')
  const [numPayments, setNumPayments] = useState(12)
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const [dedication, setDedication] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const finalAmount = selected || Number(custom) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalAmount) { setError('יש לבחור סכום'); return }
    setLoading(true)
    setError('')
    onSubmit({ amount: finalAmount, paymentType, numPayments, donorName, donorEmail, donorPhone, dedication })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Amount buttons */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">בחר סכום תרומה</p>
        <div className="grid grid-cols-3 gap-2">
          {amounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setSelected(a); setCustom('') }}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={selected === a
                ? { backgroundColor: primaryColor, color: 'white', transform: 'scale(1.05)' }
                : { backgroundColor: '#f3f4f6', color: '#374151' }
              }
            >
              ₪{a.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null) }}
          placeholder="סכום אחר..."
          min="1"
          className="mt-2 w-full border border-gray-200 rounded-2xl px-4 py-3 text-center text-lg font-bold outline-none focus:ring-2"
          dir="ltr"
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      {/* Payment type */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">סוג תשלום</p>
        <div className="flex gap-2">
          {([['one_time', 'חד-פעמי'], ['recurring', 'הוראת קבע']] as [PaymentType, string][]).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPaymentType(val)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
              style={paymentType === val
                ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` }
                : { borderColor: '#e5e7eb', color: '#6b7280' }
              }
            >
              {label}
            </button>
          ))}
        </div>
        {paymentType === 'recurring' && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-600">מספר תשלומים:</label>
            <input
              type="number"
              value={numPayments}
              onChange={e => setNumPayments(Number(e.target.value))}
              min="2" max="36"
              className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center outline-none focus:ring-2"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* Donor details toggle */}
      <button
        type="button"
        onClick={() => setShowDetails(v => !v)}
        className="text-sm font-medium underline-offset-2 hover:underline"
        style={{ color: primaryColor }}
      >
        {showDetails ? '▲ הסתר פרטים' : '▼ הוסף פרטים אישיים (אופציונלי)'}
      </button>

      {showDetails && (
        <div className="space-y-3">
          <input value={donorName} onChange={e => setDonorName(e.target.value)}
            placeholder="שם מלא"
            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={donorPhone} onChange={e => setDonorPhone(e.target.value)}
              placeholder="טלפון" type="tel" dir="ltr"
              className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2" />
            <input value={donorEmail} onChange={e => setDonorEmail(e.target.value)}
              placeholder="אימייל" type="email" dir="ltr"
              className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2" />
          </div>
          <textarea value={dedication} onChange={e => setDedication(e.target.value)}
            placeholder='הקדשה: לע"נ / לרפואת...'
            rows={2}
            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 resize-none" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !finalAmount}
        className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> מכין תשלום...</> : `לתשלום — ₪${finalAmount.toLocaleString()}`}
      </button>
    </form>
  )
}

/* ─── Main DonationFlow ─── */
export default function DonationFlow({ campaignId, campaignSlug, primaryColor = '#2563eb', donationAmounts = [50, 100, 200, 360, 500, 1000] }: Props) {
  const [state, setState] = useState<FlowState>('select')
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [donationId, setDonationId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const { status, data: paymentData } = usePaymentStatus(
    state === 'iframe' ? donationId : null
  )

  // Watch polling result
  useEffect(() => {
    if (status === 'success') setState('success')
    if (status === 'failed') {
      setErrorMsg('התשלום נכשל. אנא נסה שוב.')
      setState('error')
    }
  }, [status])

  async function handleSubmit(params: {
    amount: number
    paymentType: 'one_time' | 'recurring'
    numPayments: number
    donorName: string
    donorEmail: string
    donorPhone: string
    dedication: string
  }) {
    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          amountShekels: params.amount,
          paymentType: params.paymentType,
          numPayments: params.numPayments,
          donorName: params.donorName || undefined,
          donorEmail: params.donorEmail || undefined,
          donorPhone: params.donorPhone || undefined,
          dedication: params.dedication || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.iframeUrl) throw new Error(json.error || 'שגיאה')

      setIframeUrl(json.iframeUrl)
      setDonationId(json.donationId)
      setState('iframe')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהכנת התשלום'
      setErrorMsg(msg)
      setState('error')
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" dir="rtl">

      {/* ── State: Select ── */}
      {state === 'select' && (
        <div className="p-6">
          <h2 className="text-xl font-black text-gray-900 mb-6 text-center">לתרומה</h2>
          <AmountSelector
            amounts={donationAmounts}
            primaryColor={primaryColor}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {/* ── State: iFrame ── */}
      {(state === 'iframe' || state === 'error') && iframeUrl && (
        <div>
          {state === 'error' && (
            <div className="mx-4 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">התשלום נכשל</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setState('iframe'); setErrorMsg('') }}
                className="mr-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> נסה שוב
              </button>
            </div>
          )}
          <div className="relative">
            {state === 'iframe' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                <span className="text-xs text-gray-500">ממתין לאישור תשלום...</span>
              </div>
            )}
            <iframe
              src={iframeUrl}
              className="w-full"
              style={{ height: 580, border: 'none' }}
              title="דף תשלום מאובטח"
              allow="payment"
            />
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <button
              onClick={() => { setState('select'); setIframeUrl(null); setDonationId(null); setErrorMsg('') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← חזרה לבחירת סכום
            </button>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              תשלום מאובטח על ידי קשר
            </div>
          </div>
        </div>
      )}

      {/* ── State: Success ── */}
      {state === 'success' && (
        <div className="p-8 text-center space-y-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">תודה רבה!</h2>
            {paymentData?.donorName && (
              <p className="text-gray-600 mt-1">{paymentData.donorName}</p>
            )}
            {paymentData?.amount && (
              <p className="text-3xl font-black mt-2" style={{ color: primaryColor }}>
                ₪{paymentData.amount.toLocaleString('he-IL')}
              </p>
            )}
            <p className="text-gray-500 text-sm mt-2">תרומתך התקבלה בהצלחה!</p>
          </div>
          {paymentData?.receiptLink && (
            <a
              href={paymentData.receiptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium underline-offset-2 hover:underline"
              style={{ color: primaryColor }}
            >
              <ExternalLink className="w-4 h-4" />
              הורד קבלה
            </a>
          )}
          <button
            onClick={() => { setState('select'); setIframeUrl(null); setDonationId(null) }}
            className="block w-full py-3 rounded-2xl border-2 text-sm font-bold transition-colors hover:bg-gray-50"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            תרומה נוספת
          </button>
        </div>
      )}
    </div>
  )
}
