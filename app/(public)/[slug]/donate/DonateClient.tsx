'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  org: { id: string; name: string; slug: string }
  campaign: { id: string; title: string; slug: string; goal_amount: number; raised_amount: number }
  settings: { donation_amounts?: number[]; primary_color?: string }
  donationUrl: string
  presetAmount?: number
  groupSlug?: string
  callerId?: string
  paymentError?: boolean
}

export default function DonateClient({
  org,
  campaign,
  settings,
  donationUrl,
  presetAmount,
  groupSlug,
  callerId,
  paymentError,
}: Props) {
  const primaryColor = settings?.primary_color || '#2563eb'
  const donationAmounts = settings?.donation_amounts || [180, 360, 720, 1800, 3600]

  const [step, setStep] = useState<'amount' | 'details' | 'payment'>(
    presetAmount ? 'details' : 'amount'
  )
  const [amount, setAmount] = useState(presetAmount || 0)
  const [customAmount, setCustomAmount] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dedication: '',
    anonymous: false,
  })

  const finalAmount = amount || Number(customAmount) || 0

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function buildPaymentUrl(): string {
    const params = new URLSearchParams()

    if (finalAmount) params.set('total', String(finalAmount))

    if (!form.anonymous) {
      if (form.firstName) params.set('firstName', form.firstName)
      if (form.lastName) params.set('lastName', form.lastName)
      if (form.phone) params.set('tel', form.phone)
      if (form.email) params.set('mail', form.email)
    }

    if (form.dedication) params.set('comment', form.dedication)
    if (groupSlug) params.set('group', groupSlug)

    // campaign ID — יחזור בwebhook כ-adddata
    params.set('addactiondata', campaign.id)

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    params.set('successurl', `${origin}/${campaign.slug}/thanks`)

    const separator = donationUrl.includes('?') ? '&' : '?'
    return `${donationUrl}${separator}${params.toString()}`
  }

  // Payment not configured
  if (!donationUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">🔧</div>
          <h2 className="text-xl font-bold text-gray-800">הסליקה טרם הוגדרה</h2>
          <p className="text-gray-500 text-sm">
            המנהל טרם הגדיר את פרטי הסליקה. אנא פנה אליו.
          </p>
          <Link href={`/${campaign.slug}`} className="text-blue-600 hover:underline text-sm block">
            חזרה לדף הקמפיין
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="text-white py-6 px-4 text-center" style={{ backgroundColor: primaryColor }}>
        <Link href={`/${campaign.slug}`} className="text-white/70 text-sm hover:text-white block mb-1">
          ← {campaign.title}
        </Link>
        <h1 className="text-xl font-bold">תרומה</h1>
        <div className="text-white/80 text-sm mt-1">{org.name}</div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Payment error banner */}
        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
            התשלום נכשל. אנא נסה שוב.
          </div>
        )}

        {/* Step 1: Amount */}
        {step === 'amount' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-center text-gray-800">בחר סכום תרומה</h2>
            <div className="grid grid-cols-3 gap-2">
              {donationAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount('') }}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    amount === a ? 'text-white scale-105 shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  style={amount === a ? { backgroundColor: primaryColor } : {}}
                >
                  ₪{a.toLocaleString()}
                </button>
              ))}
            </div>
            <div>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }}
                placeholder="סכום אחר..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-bold outline-none focus:ring-2 focus:border-transparent"
                dir="ltr"
                min="1"
              />
            </div>
            <button
              onClick={() => setStep('details')}
              disabled={!finalAmount}
              className="w-full py-4 rounded-xl font-bold text-white text-lg disabled:opacity-40 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              המשך — ₪{finalAmount ? finalAmount.toLocaleString() : '0'}
            </button>
          </div>
        )}

        {/* Step 2: Donor details */}
        {step === 'details' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">פרטי התורם</h2>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>
                ₪{finalAmount.toLocaleString()}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={(e) => setField('anonymous', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-600">תרומה אנונימית</span>
            </label>

            {!form.anonymous && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">שם</label>
                    <input
                      value={form.firstName}
                      onChange={(e) => setField('firstName', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">שם משפחה</label>
                    <input
                      value={form.lastName}
                      onChange={(e) => setField('lastName', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">טלפון</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      dir="ltr"
                      placeholder="050-0000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">אימייל</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      dir="ltr"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                הקדשה <span className="text-gray-300">(אופציונלי)</span>
              </label>
              <textarea
                value={form.dedication}
                onChange={(e) => setField('dedication', e.target.value)}
                placeholder='לע"נ / לרפואת / לכבוד...'
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep('amount')}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                חזרה
              </button>
              <button
                onClick={() => {
                  // שמור פרטי תורם ל-localStorage לשימוש בדף תודה
                  localStorage.setItem('kafool_donor', JSON.stringify({
                    name: [form.firstName, form.lastName].filter(Boolean).join(' ') || null,
                    phone: form.phone || null,
                    email: form.email || null,
                    dedication: form.dedication || null,
                    anonymous: form.anonymous,
                  }))
                  setStep('payment')
                }}
                className="flex-[2] py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                המשך לתשלום
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Kesher payment iframe */}
        {step === 'payment' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">תשלום מאובטח</h2>
                <p className="text-xs text-gray-400 mt-0.5">מאובטח על ידי קשר</p>
              </div>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>
                ₪{finalAmount.toLocaleString()}
              </span>
            </div>
            <iframe
              src={buildPaymentUrl()}
              className="w-full"
              style={{ height: '580px', border: 'none' }}
              title="דף תשלום מאובטח"
              allow="payment"
            />
            <div className="p-3 text-center">
              <button
                onClick={() => setStep('details')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                חזרה לפרטים
              </button>
            </div>
          </div>
        )}

        {/* Security notice */}
        <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <span>🔒</span>
          <span>תשלום מאובטח — פרטי הכרטיס מעובדים על ידי קשר בלבד</span>
        </div>
      </div>
    </div>
  )
}
