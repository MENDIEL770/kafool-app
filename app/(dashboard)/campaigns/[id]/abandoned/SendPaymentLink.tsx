'use client'

import { useState } from 'react'
import { Send, MessageCircle, Smartphone, X, Check } from 'lucide-react'

// A per-lead "send a payment link" control: pre-fills the amount the donor chose
// (editable), builds a link to the campaign page that opens the donation modal at
// that amount (the donor picks the method there — all configured methods show),
// and sends it via WhatsApp (opens wa.me) or SMS (Yemot).
export default function SendPaymentLink({
  slug, campaignTitle, phone, defaultAmount, method,
}: {
  slug: string
  campaignTitle: string
  phone: string
  defaultAmount: number
  method: string
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(defaultAmount || ''))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'ok' | 'err' | null>(null)

  const amt = Math.round(Number(amount) || 0)

  function link(): string {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.kafool.com'
    const m = method === 'hok' ? '&m=hok' : ''
    return `${base}/${slug}?amt=${amt}${m}`
  }

  function message(): string {
    return `שלום 🙏\nלהשלמת התרומה ל"${campaignTitle}" בלחיצה על הקישור:\n${link()}\nתודה רבה!`
  }

  function sendWhatsApp() {
    if (amt <= 0) return
    const d = phone.replace(/\D/g, '')
    const intl = d.startsWith('0') ? '972' + d.slice(1) : d
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message())}`, '_blank', 'noopener')
    setResult('ok')
    setTimeout(() => setOpen(false), 800)
  }

  async function sendSms() {
    if (amt <= 0) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: [phone], message: message() }),
      })
      setResult(res.ok ? 'ok' : 'err')
    } catch {
      setResult('err')
    }
    setBusy(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => { setOpen(v => !v); setResult(null) }}
        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="שלח קישור תשלום"
      >
        <Send className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl" dir="rtl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black text-gray-800">שליחת קישור תשלום</span>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500"><X className="w-4 h-4" /></button>
            </div>

            <label className="mb-1 block text-xs font-medium text-gray-500">סכום (₪)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mb-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              dir="ltr"
            />
            <p className="mb-3 text-[11px] text-gray-400">התורם יבחר את אמצעי התשלום בדף.</p>

            <div className="flex gap-2">
              <button
                onClick={sendWhatsApp}
                disabled={amt <= 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
              >
                <MessageCircle className="w-4 h-4" /> וואטסאפ
              </button>
              <button
                onClick={sendSms}
                disabled={amt <= 0 || busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <Smartphone className="w-4 h-4" /> {busy ? '...' : 'SMS'}
              </button>
            </div>

            {result === 'ok' && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
                <Check className="w-3.5 h-3.5" /> נשלח!
              </p>
            )}
            {result === 'err' && <p className="mt-2 text-xs text-red-500">השליחה נכשלה — נסה שוב.</p>}
          </div>
        </>
      )}
    </div>
  )
}
