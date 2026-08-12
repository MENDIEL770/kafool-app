'use client'

import { useState } from 'react'
import { Globe, X, Loader2 } from 'lucide-react'

const SYMBOL: Record<string, string> = { usd: '$', eur: '€', gbp: '£', ils: '₪' }

// "Donate from abroad" — a Stripe-hosted checkout for foreign-currency gifts.
// The donor picks an amount here (our system controls it), then we create a
// Checkout Session server-side and redirect to Stripe's secure page.
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
  const sym = SYMBOL[currency] || currency.toUpperCase()

  async function pay() {
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) { setError('נא להזין סכום'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/donations/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, groupSlug, amount: amt, name, email }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.url) { window.location.href = d.url; return }
      setError(d?.error || 'אירעה שגיאה, נסו שוב')
    } catch {
      setError('אירעה שגיאה, נסו שוב')
    }
    setBusy(false)
  }

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" dir="rtl" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">תרומה מחו״ל</h3>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500"><X className="w-5 h-5" /></button>
            </div>

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
              {busy ? 'מעביר לתשלום…' : 'המשך לתשלום מאובטח'}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">התשלום מתבצע בעמוד מאובטח של Stripe</p>
          </div>
        </div>
      )}
    </>
  )
}
