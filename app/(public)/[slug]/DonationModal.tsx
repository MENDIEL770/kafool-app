'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, RefreshCw, Smartphone, Landmark } from 'lucide-react'

interface Group { id: string; name: string; slug: string }
interface PaymentUrls { one_time: string; hok: string; bit: string; bank: string }

const PAYMENT_METHODS = [
  { key: 'one_time', label: 'תרומה חד"פ',   Icon: CreditCard  },
  { key: 'hok',      label: 'הוראת קבע',    Icon: RefreshCw   },
  { key: 'bit',      label: 'ביט',           Icon: Smartphone  },
  { key: 'bank',     label: 'העברה בנקאית', Icon: Landmark    },
] as const

type PaymentMethod = typeof PAYMENT_METHODS[number]['key']

interface Props {
  isOpen: boolean
  onClose: () => void
  presetAmount?: number
  presetGroupSlug?: string
  presetMethod?: PaymentMethod
  presetMonths?: number
  donationUrl: string
  paymentUrls?: PaymentUrls
  campaign: { id: string; title: string; slug: string }
  primaryColor: string
  buttonRadius: string
  groups: Group[]
}

export default function DonationModal({
  isOpen,
  onClose,
  presetAmount,
  presetGroupSlug,
  presetMethod,
  presetMonths,
  donationUrl,
  paymentUrls,
  campaign,
  primaryColor,
  buttonRadius,
  groups,
}: Props) {
  const [step, setStep] = useState<'details' | 'payment'>('details')
  const [amount, setAmount] = useState(typeof presetAmount === 'number' ? presetAmount : 0)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedGroupSlug, setSelectedGroupSlug] = useState(presetGroupSlug || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(presetMethod ?? 'one_time')
  const [months, setMonths] = useState<number>(presetMonths ?? 12)

  // Available methods = only those with a URL configured
  const availableMethods = PAYMENT_METHODS.filter(m =>
    m.key === 'one_time' ? !!donationUrl : !!(paymentUrls?.[m.key])
  )
  const hasMultipleMethods = availableMethods.length > 1

  function getActiveUrl(): string {
    if (paymentMethod === 'one_time') return donationUrl
    return paymentUrls?.[paymentMethod] || donationUrl
  }
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', dedication: '', anonymous: false,
  })

  // Reset when opened with new preset
  useEffect(() => {
    if (isOpen) {
      setAmount(typeof presetAmount === 'number' ? presetAmount : 0)
      setCustomAmount(presetAmount ? '' : '')
      setSelectedGroupSlug(presetGroupSlug || '')
      setPaymentMethod(presetMethod ?? 'one_time')
      setMonths(presetMonths ?? 12)
      setStep('details')
    }
  }, [isOpen, presetAmount, presetGroupSlug, presetMethod, presetMonths])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const finalAmount = amount || Number(customAmount) || 0
  // required donor details (unless anonymous): name, phone, email
  const detailsValid = form.anonymous || (!!form.firstName.trim() && !!form.phone.trim() && !!form.email.trim())
  const canProceed = finalAmount > 0 && detailsValid

  function setField(key: string, value: string | boolean) {
    setForm(p => ({ ...p, [key]: value }))
  }

  function buildPaymentUrl() {
    const activeUrl = getActiveUrl()
    const params = new URLSearchParams()
    if (finalAmount) params.set('total', String(finalAmount))
    if (!form.anonymous) {
      // Kesher param names are lowercase (per Kesher docs)
      if (form.firstName) params.set('firstname', form.firstName)
      if (form.lastName) params.set('lastname', form.lastName)
      if (form.phone) params.set('tel', form.phone)
      if (form.email) params.set('mail', form.email)
    }
    if (form.dedication) params.set('comment', form.dedication)
    if (selectedGroupSlug) params.set('group', selectedGroupSlug)
    // standing order: number of payments (Kesher: numpayment) + credittype 4 = תשלומים בהו"ק
    if (paymentMethod === 'hok' && months && months > 0) {
      params.set('numpayment', String(months))
      params.set('credittype', '4')
    }
    params.set('addactiondata', campaign.id)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    params.set('successurl', `${origin}/${campaign.slug}/thanks`)
    const sep = activeUrl.includes('?') ? '&' : '?'
    return `${activeUrl}${sep}${params.toString()}`
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-black text-gray-900 text-lg">
              {step === 'payment' ? 'תשלום מאובטח' : 'פרטי התורם'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{campaign.title}</p>
          </div>
          <div className="flex items-center gap-3">
            {finalAmount > 0 && (
              <span className="font-black text-base text-left leading-tight" style={{ color: primaryColor }}>
                ₪{finalAmount.toLocaleString()}
                {paymentMethod === 'hok' && months > 0 && (
                  <span className="block text-[10px] font-bold opacity-80">לחודש × {months} ח׳</span>
                )}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">

          {/* Step: Amount (if no preset) */}
          {step === 'details' && !presetAmount && amount === 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <label className="text-xs font-medium text-gray-500 block mb-2">סכום התרומה</label>
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="הזן סכום..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-center outline-none focus:ring-2"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                dir="ltr"
                min="1"
              />
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="px-5 py-4 space-y-4">

              {/* אמצעי תשלום — מתחת לשדה סכום התרומה */}
              {hasMultipleMethods && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">אמצעי תשלום</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMethods.map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          paymentMethod === m.key
                            ? 'border-current text-current'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        style={paymentMethod === m.key ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                      >
                        <m.Icon className="w-4 h-4 shrink-0" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* standing-order duration — chosen in the form, sent to Kesher */}
              {paymentMethod === 'hok' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">מספר חודשי הוראת הקבע</label>
                  <select
                    value={months}
                    onChange={e => setMonths(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    {[6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} חודשים</option>)}
                  </select>
                  {finalAmount > 0 && months > 0 && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
                      ₪{finalAmount.toLocaleString()} לחודש × {months} חודשים = <strong className="text-gray-900">₪{(finalAmount * months).toLocaleString()}</strong> בסך הכל
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={e => setField('anonymous', e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: primaryColor }}
                />
                <span className="text-sm text-gray-600">תרומה אנונימית</span>
              </label>

              {!form.anonymous && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">שם <span className="text-red-400">*</span></label>
                      <input value={form.firstName} onChange={e => setField('firstName', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">שם משפחה</label>
                      <input value={form.lastName} onChange={e => setField('lastName', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">טלפון <span className="text-red-400">*</span></label>
                      <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        dir="ltr" placeholder="050-0000000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">אימייל <span className="text-red-400">*</span></label>
                      <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        dir="ltr" placeholder="you@example.com" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  הקדשה <span className="text-gray-300">(אופציונלי)</span>
                </label>
                <textarea value={form.dedication} onChange={e => setField('dedication', e.target.value)}
                  placeholder='לע"נ / לרפואת / לכבוד...' rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {groups.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    שיוך לקבוצה <span className="text-gray-300">(אופציונלי)</span>
                  </label>
                  <select value={selectedGroupSlug} onChange={e => setSelectedGroupSlug(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="">ללא קבוצה</option>
                    {groups.map(g => <option key={g.id} value={g.slug}>{g.name}</option>)}
                  </select>
                </div>
              )}

              {/* בולט מודגש לפני התשלום */}
              {paymentMethod === 'hok' && (
                <p className="text-sm font-bold text-center text-gray-800">* לא תופס את מסגרת האשראי</p>
              )}

              <button
                onClick={() => {
                  localStorage.setItem('kafool_donor', JSON.stringify({
                    name: [form.firstName, form.lastName].filter(Boolean).join(' ') || null,
                    phone: form.phone || null,
                    email: form.email || null,
                    dedication: form.dedication || null,
                    anonymous: form.anonymous,
                  }))
                  setStep('payment')
                }}
                disabled={!canProceed}
                className={`w-full py-4 font-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all ${buttonRadius}`}
                style={{ backgroundColor: primaryColor }}
              >
                {(() => {
                  const total = paymentMethod === 'hok' ? finalAmount * months : finalAmount
                  return (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold opacity-90">המשך לתשלום</span>
                      {total > 0 && <span className="text-xl font-black">₪{total.toLocaleString()}</span>}
                    </span>
                  )
                })()}
              </button>

              {!form.anonymous && finalAmount > 0 && !detailsValid && (
                <p className="text-center text-xs text-amber-600 -mt-1">
                  יש למלא שם, טלפון ואימייל כדי להמשיך (או לסמן "תרומה אנונימית")
                </p>
              )}

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <span>🔒</span> תשלום מאובטח — קשר
              </p>
            </div>
          )}

          {/* Step: Payment iframe */}
          {step === 'payment' && (() => {
            const payUrl = buildPaymentUrl()
            const isValid = payUrl.startsWith('http://') || payUrl.startsWith('https://')
            if (!isValid) {
              return (
                <div className="px-5 py-10 text-center space-y-3">
                  <div className="text-4xl">⚙️</div>
                  <p className="font-bold text-gray-700">דף התשלום טרם הוגדר</p>
                  <p className="text-sm text-gray-400">יש להגדיר קישור תשלום בהגדרות הארגון</p>
                  <button onClick={() => setStep('details')} className="text-sm text-blue-500 hover:underline">
                    ← חזרה
                  </button>
                </div>
              )
            }
            return (
              <div className="flex flex-col">
                <iframe
                  src={payUrl}
                  className="w-full"
                  style={{ height: '520px', border: 'none' }}
                  title="דף תשלום מאובטח"
                  allow="payment"
                />
                <div className="px-5 pb-4 pt-2 text-center">
                  <button onClick={() => setStep('details')} className="text-xs text-gray-400 hover:text-gray-600">
                    ← חזרה לפרטים
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
