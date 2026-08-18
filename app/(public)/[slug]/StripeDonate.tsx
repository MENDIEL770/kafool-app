'use client'

import { useState, useCallback } from 'react'
import { Globe, X, Loader2, ChevronRight } from 'lucide-react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

const SYMBOL: Record<string, string> = { usd: '$', eur: '€', gbp: '£', ils: '₪' }

// "Donate from abroad" — a Stripe Checkout for foreign-currency gifts, EMBEDDED
// in the page (iframe) rather than a redirect. The donor picks an amount here
// (our system controls it), we create an embedded Checkout Session on the org's
// Stripe account, and render it inline with the org's publishable key.
export default function StripeDonate({
  campaignId, groupSlug, currency, amounts, primaryColor, buttonRadius,
}: {
  campaignId: string
  groupSlug?: string
  currency: string
  amounts: number[]
  primaryColor: string
  buttonRadius: string
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<number | ''>(amounts[0] || '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recurring, setRecurring] = useState(false)
  const [months, setMonths] = useState<number | ''>('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const sym = SYMBOL[currency] || currency.toUpperCase()

  function reset() {
    setClientSecret(null); setStripePromise(null); setBusy(false); setError(null)
  }
  function close() { setOpen(false); reset() }

  async function pay() {
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) { setError('נא להזין סכום'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/donations/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, groupSlug, amount: amt, name, email, recurring, months: recurring ? Math.round(Number(months) || 0) : 0 }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.clientSecret && d?.publishableKey) {
        setStripePromise(loadStripe(d.publishableKey))
        setClientSecret(d.clientSecret) // switches the modal to the embedded checkout
        return
      }
      setError(d?.error || 'אירעה שגיאה, נסו שוב')
    } catch {
      setError('אירעה שגיאה, נסו שוב')
    }
    setBusy(false)
  }

  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret || ''), [clientSecret])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-center gap-2 py-3 font-bold border-2 transition-colors hover:bg-gray-50 ${buttonRadius}`}
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        <Globe className="w-4 h-4" />
        תרומה מחו״ל ({sym})
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" dir="rtl" onClick={close}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">תרומה מחו״ל</h3>
              <button onClick={close} className="text-gray-300 hover:text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            {/* Step 2: embedded Stripe checkout (in-page iframe) */}
            {clientSecret && stripePromise ? (
              <div>
                <button onClick={reset} className="mb-3 flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600">
                  <ChevronRight className="h-3.5 w-3.5" /> חזרה
                </button>
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              /* Step 1: amount + type */
              <>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[{ v: false, l: 'חד-פעמי' }, { v: true, l: 'הוראת קבע (חודשי)' }].map(o => (
                    <button
                      key={o.l}
                      onClick={() => setRecurring(o.v)}
                      className="rounded-xl border py-2 text-sm font-bold transition-colors"
                      style={recurring === o.v
                        ? { background: primaryColor, color: '#fff', borderColor: primaryColor }
                        : { borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>

                {recurring && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-gray-500">מספר חודשים לחיוב</label>
                    <select
                      value={months}
                      onChange={e => setMonths(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">ללא הגבלה (עד ביטול)</option>
                      {[3, 6, 10, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} חודשים</option>)}
                    </select>
                  </div>
                )}

                <div className="mb-3 grid grid-cols-4 gap-2">
                  {amounts.map(a => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className="rounded-xl border py-2 text-sm font-bold transition-colors"
                      style={amount === a
                        ? { background: primaryColor, color: '#fff', borderColor: primaryColor }
                        : { borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      {sym}{a}
                    </button>
                  ))}
                </div>
                <input
                  type="number" min={1} value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`${sym} סכום אחר`}
                  className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" dir="ltr"
                />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא" className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="אימייל (לקבלה)" dir="ltr" className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />

                {error && <p className="mb-2 text-center text-sm text-red-500">{error}</p>}

                <button
                  onClick={pay}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-black text-white disabled:opacity-50"
                  style={{ background: primaryColor }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {busy ? 'טוען תשלום…' : recurring ? `הוראת קבע ${sym}${Math.round(Number(amount) || 0)} לחודש` : 'המשך לתשלום'}
                </button>
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  {recurring
                    ? (Number(months) > 0
                        ? `${months} חיובים חודשיים בכרטיס אשראי · ניתן לביטול בכל עת`
                        : 'חיוב חודשי מתחדש בכרטיס אשראי · ניתן לביטול בכל עת')
                    : 'תשלום מאובטח דרך Stripe'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
