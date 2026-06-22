'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, RefreshCw, Smartphone, Landmark } from 'lucide-react'

interface Group { id: string; name: string; slug: string }
interface PaymentUrls { one_time: string; hok: string; bit: string; bank: string; one_time_en?: string; hok_en?: string }
interface NedarimConfig { mosad: string; apiValid: string; active: boolean }

type Lang = 'he' | 'en'

const PAYMENT_METHODS = [
  { key: 'one_time', Icon: CreditCard  },
  { key: 'hok',      Icon: RefreshCw   },
  { key: 'bit',      Icon: Smartphone  },
  { key: 'bank',     Icon: Landmark    },
] as const

type PaymentMethod = typeof PAYMENT_METHODS[number]['key']

const METHOD_LABEL: Record<PaymentMethod, [string, string]> = {
  one_time: ['תרומה חד"פ', 'One-time'],
  hok:      ['הוראת קבע', 'Monthly'],
  bit:      ['ביט', 'Bit'],
  bank:     ['העברה בנקאית', 'Bank transfer'],
}

interface Props {
  isOpen: boolean
  onClose: () => void
  presetAmount?: number
  presetGroupSlug?: string
  presetMethod?: PaymentMethod
  presetMonths?: number
  donationUrl: string
  paymentUrls?: PaymentUrls
  paymentProvider?: string
  nedarim?: NedarimConfig | null
  campaign: { id: string; title: string; slug: string }
  primaryColor: string
  buttonRadius: string
  groups: Group[]
  lang?: Lang
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
  paymentProvider,
  campaign,
  primaryColor,
  buttonRadius,
  groups,
  lang = 'he',
}: Props) {
  const en = lang === 'en'
  const T = {
    securePay: en ? 'Secure payment' : 'תשלום מאובטח',
    donorDetails: en ? 'Donor details' : 'פרטי התורם',
    amountLabel: en ? 'Donation amount' : 'סכום התרומה',
    amountPh: en ? 'Enter amount...' : 'הזן סכום...',
    paymentMethod: en ? 'Payment method' : 'אמצעי תשלום',
    hokMonths: en ? 'Number of monthly payments' : 'מספר חודשי הוראת הקבע',
    anonymous: en ? 'Anonymous donation' : 'תרומה אנונימית',
    firstName: en ? 'First name' : 'שם',
    lastName: en ? 'Last name' : 'שם משפחה',
    phone: en ? 'Phone' : 'טלפון',
    email: en ? 'Email' : 'אימייל',
    dedication: en ? 'Dedication' : 'הקדשה',
    optional: en ? '(optional)' : '(אופציונלי)',
    dedicationPh: en ? 'In memory of / for the recovery of / in honor of...' : 'לע"נ / לרפואת / לכבוד...',
    group: en ? 'Assign to group' : 'שיוך לקבוצה',
    noGroup: en ? 'No group' : 'ללא קבוצה',
    noCreditHold: en ? '* Does not hold your credit limit' : '* לא תופס את מסגרת האשראי',
    continueToPay: en ? 'Continue to payment' : 'המשך לתשלום',
    fillRequired: en ? 'Please enter name, phone and email to continue (or check "Anonymous donation")' : 'יש למלא שם, טלפון ואימייל כדי להמשיך (או לסמן "תרומה אנונימית")',
    perMonth: en ? '/mo' : 'לחודש',
    months: en ? 'months' : 'חודשים',
    total: en ? 'total' : 'בסך הכל',
    notConfigured: en ? 'Payment page not set up yet' : 'דף התשלום טרם הוגדר',
    notConfiguredSub: en ? 'Set a payment link in the organization settings' : 'יש להגדיר קישור תשלום בהגדרות הארגון',
    back: en ? '← Back' : '← חזרה',
    backToDetails: en ? '← Back to details' : '← חזרה לפרטים',
  }
  const [step, setStep] = useState<'details' | 'payment'>('details')
  const [amount, setAmount] = useState(typeof presetAmount === 'number' ? presetAmount : 0)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedGroupSlug, setSelectedGroupSlug] = useState(presetGroupSlug || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(presetMethod ?? 'one_time')
  const [months, setMonths] = useState<number>(presetMonths ?? 12)

  // Available methods = only those with a URL configured.
  // Bit is NOT a top-level method — it's offered as a separate button under
  // one-time payment (opens its own link in a new tab).
  const availableMethods = PAYMENT_METHODS.filter(m =>
    m.key === 'bit' ? false
      : m.key === 'one_time' ? !!donationUrl
      : !!(paymentUrls?.[m.key])
  )
  const bitUrl = paymentUrls?.bit || ''
  const hasMultipleMethods = availableMethods.length > 1

  function getActiveUrl(): string {
    // In English, use the English Kesher page for חד"פ / הו"ק when configured.
    if (paymentMethod === 'one_time') return (en && paymentUrls?.one_time_en) || donationUrl
    if (paymentMethod === 'hok') return (en && paymentUrls?.hok_en) || paymentUrls?.hok || donationUrl
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

  // Save donor details locally so the thanks page can attach them to the donation.
  function persistDonor() {
    localStorage.setItem('kafool_donor', JSON.stringify({
      name: [form.firstName, form.lastName].filter(Boolean).join(' ') || null,
      phone: form.phone || null,
      email: form.email || null,
      dedication: form.dedication || null,
      anonymous: form.anonymous,
    }))
  }

  function buildPaymentUrl(baseUrl?: string) {
    const activeUrl = baseUrl ?? getActiveUrl()
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
    // Nedarim-hosted payment pages route their server CallBack by Param1/Param2,
    // so the webhook can attach the donation to the right campaign/group.
    params.set('Param1', campaign.id)
    if (selectedGroupSlug) params.set('Param2', selectedGroupSlug)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    // Carry the donor details on the success URL so the thanks page can save them
    // server-side (the in-iframe localStorage/RLS update is unreliable on mobile).
    const sParams = new URLSearchParams()
    if (!form.anonymous) {
      const name = [form.firstName, form.lastName].filter(Boolean).join(' ').trim()
      if (name) sParams.set('dn', name)
      if (form.phone) sParams.set('dp', form.phone)
      if (form.email) sParams.set('de', form.email)
    }
    if (form.dedication) sParams.set('dd', form.dedication)
    if (selectedGroupSlug) sParams.set('dg', selectedGroupSlug)
    // Standing order: carry type + monthly amount + #months so the thanks page
    // can record the FULL commitment (monthly × months), not just one payment.
    if (paymentMethod === 'hok' && months && months > 0) {
      sParams.set('dpt', 'hok')
      sParams.set('dmo', String(months))
      if (finalAmount) sParams.set('dma', String(finalAmount))
    }
    const successUrl = `${origin}/${campaign.slug}/thanks${sParams.toString() ? `?${sParams.toString()}` : ''}`
    params.set('successurl', successUrl)
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
              {step === 'payment' ? T.securePay : T.donorDetails}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{campaign.title}</p>
          </div>
          <div className="flex items-center gap-3">
            {finalAmount > 0 && (
              <span className="font-black text-base text-left leading-tight" style={{ color: primaryColor }}>
                ₪{finalAmount.toLocaleString()}
                {paymentMethod === 'hok' && months > 0 && (
                  <span className="block text-[10px] font-bold opacity-80">{T.perMonth} × {months}</span>
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
              <label className="text-xs font-medium text-gray-500 block mb-2">{T.amountLabel}</label>
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder={T.amountPh}
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
                  <label className="text-xs font-medium text-gray-500">{T.paymentMethod}</label>
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
                        {METHOD_LABEL[m.key][en ? 1 : 0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* standing-order duration — chosen in the form, sent to Kesher */}
              {paymentMethod === 'hok' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{T.hokMonths}</label>
                  <select
                    value={months}
                    onChange={e => setMonths(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    {[6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} {T.months}</option>)}
                  </select>
                  {finalAmount > 0 && months > 0 && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
                      ₪{finalAmount.toLocaleString()} {T.perMonth} × {months} {T.months} = <strong className="text-gray-900">₪{(finalAmount * months).toLocaleString()}</strong> {T.total}
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
                <span className="text-sm text-gray-600">{T.anonymous}</span>
              </label>

              {!form.anonymous && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">{T.firstName} <span className="text-red-400">*</span></label>
                      <input value={form.firstName} onChange={e => setField('firstName', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">{T.lastName}</label>
                      <input value={form.lastName} onChange={e => setField('lastName', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">{T.phone} <span className="text-red-400">*</span></label>
                      <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        dir="ltr" placeholder="050-0000000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">{T.email} <span className="text-red-400">*</span></label>
                      <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        dir="ltr" placeholder="you@example.com" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  {T.dedication} <span className="text-gray-300">{T.optional}</span>
                </label>
                <textarea value={form.dedication} onChange={e => setField('dedication', e.target.value)}
                  placeholder={T.dedicationPh} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {groups.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    {T.group} <span className="text-gray-300">{T.optional}</span>
                  </label>
                  <select value={selectedGroupSlug} onChange={e => setSelectedGroupSlug(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="">{T.noGroup}</option>
                    {groups.map(g => <option key={g.id} value={g.slug}>{g.name}</option>)}
                  </select>
                </div>
              )}

              {/* בולט מודגש לפני התשלום */}
              {paymentMethod === 'hok' && (
                <p className="text-sm font-bold text-center text-gray-800">{T.noCreditHold}</p>
              )}

              <button
                onClick={() => { persistDonor(); setStep('payment') }}
                disabled={!canProceed}
                className={`w-full py-4 font-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all ${buttonRadius}`}
                style={{ backgroundColor: primaryColor }}
              >
                {(() => {
                  const total = paymentMethod === 'hok' ? finalAmount * months : finalAmount
                  return (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold opacity-90">{T.continueToPay}</span>
                      {total > 0 && <span className="text-xl font-black">₪{total.toLocaleString()}</span>}
                    </span>
                  )
                })()}
              </button>

              {/* תשלום בביט — נפתח בקישור נפרד (טאב חדש), זמין בתרומה חד"פ */}
              {paymentMethod === 'one_time' && bitUrl && (
                <>
                  <div className="flex items-center gap-2 text-[11px] text-gray-300">
                    <span className="flex-1 h-px bg-gray-200" />
                    {en ? 'or' : 'או'}
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>
                  <button
                    type="button"
                    disabled={!canProceed}
                    onClick={() => {
                      if (!canProceed) return
                      persistDonor()
                      window.open(buildPaymentUrl(bitUrl), '_blank', 'noopener')
                    }}
                    className={`w-full py-3.5 font-black flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 ${buttonRadius}`}
                    style={{ backgroundColor: '#0A2E36', color: '#37E5E0' }}
                  >
                    <BitLogo className="w-6 h-6 rounded-md" />
                    {en ? 'Pay with Bit' : 'שלם בביט'}
                  </button>
                </>
              )}

              {!form.anonymous && finalAmount > 0 && !detailsValid && (
                <p className="text-center text-xs text-amber-600 -mt-1">
                  {T.fillRequired}
                </p>
              )}

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <span></span> {T.securePay} — {paymentProvider === 'nedarim' ? 'נדרים פלוס' : 'קשר'}
              </p>
            </div>
          )}

          {/* Step: Payment — the provider's payment page loads in an iframe */}
          {step === 'payment' && (() => {
            const payUrl = buildPaymentUrl()
            const isValid = payUrl.startsWith('http://') || payUrl.startsWith('https://')
            if (!isValid) {
              return (
                <div className="px-5 py-10 text-center space-y-3">
                  <div className="text-4xl"></div>
                  <p className="font-bold text-gray-700">{T.notConfigured}</p>
                  <p className="text-sm text-gray-400">{T.notConfiguredSub}</p>
                  <button onClick={() => setStep('details')} className="text-sm text-blue-500 hover:underline">
                    {T.back}
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
                  title={T.securePay}
                  allow="payment"
                />
                <div className="px-5 pb-4 pt-2 text-center">
                  <button onClick={() => setStep('details')} className="text-xs text-gray-400 hover:text-gray-600">
                    {T.backToDetails}
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

// Bit wordmark (Bank Hapoalim) — dark teal tile + cyan "bit".
function BitLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0A2E36" />
      <text x="32" y="44" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="34" fontWeight="700" fill="#37E5E0">bit</text>
    </svg>
  )
}
