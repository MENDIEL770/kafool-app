'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, CreditCard, RefreshCw, Smartphone, Landmark, Loader2 } from 'lucide-react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { track } from '@/lib/track'

interface Group { id: string; name: string; slug: string }
interface PaymentUrls { one_time: string; hok: string; bit: string; bank: string; one_time_en?: string; hok_en?: string }
interface NedarimConfig { mosad: string; apiValid: string; active: boolean }
interface CustomFieldDef { id: string; label: string; type: string; required: boolean; options?: string[]; unitPrice?: number; tiers?: { minQty: number; discountPercent: number }[] }

// Effective unit price = base price minus the highest quantity-discount the
// quantity qualifies for. The base comes from the donation button's amount
// (falling back to the field's own unit price).
function unitPriceForQty(base: number, tiers: { minQty: number; discountPercent: number }[] | undefined, qty: number): { unit: number; discount: number } {
  const sorted = [...(tiers || [])].sort((a, b) => a.minQty - b.minQty)
  let discount = 0
  for (const t of sorted) { if (qty >= t.minQty) discount = Number(t.discountPercent) || 0 }
  return { unit: Math.round(base * (1 - discount / 100)), discount }
}
interface CustomFormDef { id: string; name: string; headerTitle?: string; email?: { subject?: string; body?: string; image?: string }; paymentNote?: string; fields: CustomFieldDef[] }
interface PreStepOption { id: string; label: string; formId?: string }
interface PreStepDef { enabled: boolean; type?: 'choice' | 'info' | 'consent'; title: string; body?: string; image?: string; consentLabel?: string; options: PreStepOption[] }

type Lang = 'he' | 'en'

const PAYMENT_METHODS = [
  { key: 'one_time', Icon: CreditCard  },
  { key: 'hok',      Icon: RefreshCw   },
  { key: 'bit',      Icon: Smartphone  },
  { key: 'bank',     Icon: Landmark    },
] as const

type PaymentMethod = typeof PAYMENT_METHODS[number]['key']

// ₪ goes through Kesher/Nedarim; any foreign currency is charged via Stripe.
const CURRENCY_SYMBOL: Record<string, string> = { ils: '₪', usd: '$', eur: '€', gbp: '£' }

const METHOD_LABEL: Record<PaymentMethod, [string, string]> = {
  one_time: ['חיוב חד-פעמי', 'One-time'],
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
  customForms?: CustomFormDef[]
  defaultFormId?: string
  presetFormMode?: string   // per-button: '' | 'regular' | 'choice' | <formId>
  defaultPaymentNote?: string
  formEmails?: Record<string, { subject?: string; body?: string; image?: string; enabled?: boolean }>
  buttonEmails?: Record<string, { subject?: string; body?: string; image?: string; enabled?: boolean }>
  preStep?: PreStepDef | null
  // Foreign-currency (Stripe) support: whether it's on, which currencies are
  // allowed, and which one the form should start on (₪ default, or $ in English).
  stripeEnabled?: boolean
  currencies?: string[]
  defaultCurrency?: string
  ilsRate?: number   // ₪ per 1 unit of foreign currency (manager-set), for conversion
  presetForeignAmount?: number   // explicit foreign amount (e.g. a button's $ price), skips conversion
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
  customForms,
  defaultFormId,
  presetFormMode,
  defaultPaymentNote,
  formEmails,
  buttonEmails,
  preStep,
  stripeEnabled = false,
  currencies = [],
  defaultCurrency = 'ils',
  ilsRate = 3.7,
  presetForeignAmount,
}: Props) {
  // The pre-step is available once configured (choice/info/consent). It is NEVER
  // applied globally — only when a button's form setting is explicitly 'choice'.
  const hasPreStep = !!(preStep && preStep.enabled)
  const preStepType = preStep?.type || 'choice'
  const allForms = customForms || []
  // Which flow this open uses: explicit per-button setting → campaign default form.
  const resolveMode = (): string => {
    if (presetFormMode) return presetFormMode
    return defaultFormId || 'regular'
  }
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
  const [step, setStep] = useState<'choice' | 'details' | 'payment'>('details')
  const [choice, setChoice] = useState('')
  const [consented, setConsented] = useState(false)
  const [activeFormId, setActiveFormId] = useState('')   // '' = regular form
  const activeForm = allForms.find(f => f.id === activeFormId) || null
  const [amount, setAmount] = useState(typeof presetAmount === 'number' ? presetAmount : 0)
  const [customAmount, setCustomAmount] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)
  const [selectedGroupSlug, setSelectedGroupSlug] = useState(presetGroupSlug || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(presetMethod ?? 'one_time')
  const [months, setMonths] = useState<number>(presetMonths ?? 12)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  // Currency: ₪ → Kesher/Nedarim iframe; any foreign currency → Stripe (in-modal).
  const allowedCurrencies = stripeEnabled && currencies.length ? currencies : ['ils']
  const [currency, setCurrency] = useState<string>(defaultCurrency || 'ils')
  const isForeign = currency !== 'ils'
  const sym = CURRENCY_SYMBOL[currency] || currency.toUpperCase()
  // Live ₪-per-unit rates fetched from /api/fx on open; the manual rate is only a
  // fallback. rateFor returns ₪ per 1 unit of the currency (₪ itself = 1).
  const [liveRates, setLiveRates] = useState<Record<string, number>>({})
  const rateFor = (c: string) => (c === 'ils' ? 1 : (liveRates[c] || (ilsRate > 0 ? ilsRate : 3.7)))
  // In-modal Stripe embedded checkout (shown at the payment step when foreign).
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret || ''), [clientSecret])

  // The donor can always choose one-time vs monthly (הו"ק); a plan's configured
  // method is only the DEFAULT selection, never a lock. In ₪ both run through the
  // Kesher URL (הו"ק falls back to the one-time base), and Bit / bank appear when
  // their link is set. Foreign currency goes through Stripe (one-time / monthly
  // only — no Bit / bank), so those two are hidden when a foreign currency is set.
  const availableMethods = isForeign
    ? PAYMENT_METHODS.filter(m => m.key === 'one_time' || m.key === 'hok')
    : PAYMENT_METHODS.filter(m =>
        m.key === 'one_time' ? !!donationUrl
          : m.key === 'hok' ? !!(paymentUrls?.hok || donationUrl)
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
      // Preset amounts are defined in ₪; if the form opens in a foreign currency
      // (e.g. English → $), convert the preset by the manager's rate on open.
      {
        const openCur = defaultCurrency || 'ils'
        const rate0 = ilsRate > 0 ? ilsRate : 3.7
        const presetIls = typeof presetAmount === 'number' ? presetAmount : 0
        // In a foreign currency, prefer the button's explicit foreign price (no
        // conversion); otherwise convert the ₪ preset by the rate.
        if (openCur !== 'ils' && presetForeignAmount && presetForeignAmount > 0) {
          setAmount(Math.round(presetForeignAmount))
        } else {
          setAmount(openCur !== 'ils' && presetIls ? Math.round(presetIls / rate0) : presetIls)
        }
        setCustomAmount('')
      }
      setSelectedGroupSlug(presetGroupSlug || '')
      setPaymentMethod(presetMethod ?? 'one_time')
      setMonths(presetMonths ?? 12)
      setCustomValues({})
      setChoice('')
      setConsented(false)
      setCurrency(defaultCurrency || 'ils')
      setClientSecret(null); setStripePromise(null); setStripeError(null)
      const mode = resolveMode()
      if (mode === 'choice' && hasPreStep) {
        setStep('choice'); setActiveFormId('')
      } else {
        setStep('details'); setActiveFormId(mode === 'regular' || mode === 'choice' ? '' : mode)
      }
    }
  }, [isOpen, presetAmount, presetGroupSlug, presetMethod, presetMonths, hasPreStep, presetFormMode, defaultFormId, defaultCurrency, ilsRate, presetForeignAmount])

  // Bit / bank aren't available in a foreign currency (Stripe) — fall back to one-time.
  useEffect(() => {
    if (isForeign && (paymentMethod === 'bit' || paymentMethod === 'bank')) setPaymentMethod('one_time')
  }, [isForeign, paymentMethod])

  // On open, pull the LIVE ₪ rate for each allowed foreign currency.
  useEffect(() => {
    if (!isOpen || !stripeEnabled) return
    const foreign = allowedCurrencies.filter(c => c !== 'ils')
    if (!foreign.length) return
    let cancelled = false
    Promise.all(foreign.map(async c => {
      try {
        const r = await fetch(`/api/fx?currency=${c}&fallback=${ilsRate || 3.7}`)
        const d = await r.json()
        return [c, Number(d?.rate) > 0 ? Number(d.rate) : (ilsRate || 3.7)] as const
      } catch { return [c, ilsRate || 3.7] as const }
    })).then(pairs => { if (!cancelled) setLiveRates(Object.fromEntries(pairs)) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stripeEnabled])

  // Once live rates arrive, re-convert a foreign preset from its ₪ value so the
  // shown amount uses the live rate (the reset effect seeded it with the fallback).
  useEffect(() => {
    if (!isForeign || qtyField) return
    if (presetForeignAmount && presetForeignAmount > 0) return // explicit $ price — don't convert
    const presetIls = typeof presetAmount === 'number' ? presetAmount : 0
    if (!presetIls || customAmount) return
    setAmount(Math.round(presetIls / rateFor(currency)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRates])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // When the modal opens without a preset amount, put the cursor straight in the
  // amount field (so "Other amount" / a plain donate click lands ready to type).
  useEffect(() => {
    // amountRef is null when the input isn't shown (preset / quantity form), so
    // this safely no-ops in those cases.
    if (isOpen && step === 'details' && !presetAmount) {
      const id = setTimeout(() => amountRef.current?.focus(), 120)
      return () => clearTimeout(id)
    }
  }, [isOpen, step, presetAmount])

  // Usage funnel: the donor reached the payment step.
  useEffect(() => { if (isOpen && step === 'payment' && campaign?.id) track(campaign.id, 'donate_payment') }, [isOpen, step, campaign?.id])

  // A quantity field (if the active form has one) drives the amount: quantity ×
  // the unit price for the chosen quantity (tiered). Otherwise use the preset/custom amount.
  const qtyField = activeForm?.fields.find(f => f.type === 'quantity') || null
  const quantity = qtyField ? Math.max(1, Math.floor(Number(customValues[qtyField.id]) || 1)) : 0
  // base unit price = the button's amount, falling back to the field's own price
  const qtyBase = qtyField ? (amount || Number(qtyField.unitPrice) || 0) : 0
  const qtyPrice = qtyField ? unitPriceForQty(qtyBase, qtyField.tiers, quantity) : { unit: 0, discount: 0 }
  const qtyUnit = qtyPrice.unit
  const qtyTotal = qtyField ? quantity * qtyUnit : 0
  const finalAmount = qtyField ? qtyTotal : (amount || Number(customAmount) || 0)
  // required donor details (unless anonymous): name, phone, email
  const detailsValid = form.anonymous || (!!form.firstName.trim() && !!form.phone.trim() && !!form.email.trim())
  // required custom-form fields must be filled (regardless of anonymous)
  const customValid = !activeForm || activeForm.fields.filter(f => f.required && f.type !== 'quantity').every(f => (customValues[f.id] || '').trim())
  const canProceed = finalAmount > 0 && detailsValid && customValid

  function setField(key: string, value: string | boolean) {
    setForm(p => ({ ...p, [key]: value }))
  }

  // Enter jumps to the next field so the form flows top-to-bottom on one hand.
  // Textareas keep Enter for newlines; checkboxes/radios are skipped.
  function advanceOnEnter(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter') return
    const el = e.target as HTMLElement
    if (el.tagName === 'TEXTAREA') return
    const nodes = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
    ).filter(n => !n.disabled && n.offsetParent !== null && !((n as HTMLInputElement).type === 'checkbox' || (n as HTMLInputElement).type === 'radio'))
    const i = nodes.indexOf(el as HTMLInputElement)
    if (i >= 0 && i < nodes.length - 1) {
      e.preventDefault()
      nodes[i + 1].focus()
    }
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
    // Stash custom-form values (shipping etc.) keyed by label, so the payment
    // callback can re-attach them to the recorded donation by phone+amount.
    {
      const labeled: Record<string, string> = {}
      if (activeForm) for (const f of activeForm.fields) {
        if (f.type === 'quantity') { labeled[f.label] = String(quantity); continue }
        const v = (customValues[f.id] || '').trim()
        if (v) labeled[f.label] = v
      }
      if (hasPreStep && choice) labeled[preStep!.title || 'בחירה'] = choice
      if (hasPreStep && preStepType === 'consent' && consented) labeled[preStep!.consentLabel || 'אישור'] = 'כן'
      // thank-you email content override stored on the intent: per-button (opted-in
      // via its checkbox) → per-form → none. Whether an email is sent at all (incl.
      // the master default + button opt-in with no custom content) is decided server-side.
      const hasContent = (t?: { subject?: string; body?: string; image?: string }) => !!(t && (t.subject || t.body || t.image))
      const btnE = typeof presetAmount === 'number' ? buttonEmails?.[String(presetAmount)] : undefined
      const formE = activeFormId ? formEmails?.[activeFormId] : undefined
      const emailTemplate = (btnE?.enabled === true && hasContent(btnE)) ? btnE
        : (formE && formE.enabled !== false && hasContent(formE)) ? formE
        : null
      // Always record the intent (the "lead") when a donor reaches payment — so
      // an abandoned donation can be detected and the manager notified — carrying
      // the donor name + chosen method for that SMS. Skipped for foreign (Stripe)
      // donations: their amount is in $/€ while the recorded gift lands in ₪, which
      // would break abandonment matching and risk false "abandoned" alerts.
      if (finalAmount > 0 && !isForeign) {
        const donorName = [form.firstName, form.lastName].filter(Boolean).join(' ') || null
        fetch('/api/donations/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            phone: form.phone || null,
            amount: finalAmount,
            groupSlug: selectedGroupSlug || null,
            customData: labeled,
            donorName,
            paymentMethod,
            donorEmail: form.email || null,
            emailTemplate,
          }),
          keepalive: true,
        }).catch(() => {})
      }
    }
  }

  // Foreign currency → create a Stripe embedded Checkout Session on the org's
  // account and show it inline at the payment step (no separate form / redirect).
  async function startStripe() {
    setStripeError(null); setClientSecret(null); setStripePromise(null)
    setStep('payment')
    try {
      const res = await fetch('/api/donations/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          groupSlug: selectedGroupSlug || undefined,
          amount: finalAmount,
          name: [form.firstName, form.lastName].filter(Boolean).join(' '),
          phone: form.phone,
          email: form.email,
          recurring: paymentMethod === 'hok',
          months: paymentMethod === 'hok' ? months : 0,
          currency,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.clientSecret && d?.publishableKey) {
        setStripePromise(loadStripe(d.publishableKey))
        setClientSecret(d.clientSecret)
      } else {
        setStripeError(d?.error || (en ? 'Something went wrong, please try again' : 'אירעה שגיאה, נסו שוב'))
      }
    } catch {
      setStripeError(en ? 'Something went wrong, please try again' : 'אירעה שגיאה, נסו שוב')
    }
  }

  // Switching currency converts the amount by the LIVE ₪ rate, both ways: value in
  // ₪ = amount × (₪ per current unit), then ÷ (₪ per next unit). Works ₪⇄foreign
  // and foreign⇄foreign. rateFor returns 1 for ₪.
  function changeCurrency(next: string) {
    if (next === currency) return
    const v = Math.round(finalAmount * rateFor(currency) / rateFor(next))
    // Quantity-driven forms price in ₪ per unit — leave those to the ₪ flow.
    if (!qtyField) {
      if (amount > 0) setAmount(v)
      else setCustomAmount(v > 0 ? String(v) : '')
    }
    setCurrency(next)
  }

  function buildPaymentUrl(baseUrl?: string) {
    const activeUrl = baseUrl ?? getActiveUrl()
    const params = new URLSearchParams()
    const isNedarim = paymentProvider === 'nedarim'
    if (isNedarim) {
      // Nedarim Plus hosted form uses capitalized param names — its amount field
      // reads "Amount", NOT Kesher's "total" (which is why the amount used to
      // arrive blank). Monthly amount + Tashlumim mirrors the Kesher hok flow.
      if (finalAmount) params.set('Amount', String(finalAmount))
      params.set('Currency', '1') // 1 = ILS
      if (!form.anonymous) {
        if (form.firstName) params.set('FirstName', form.firstName)
        if (form.lastName) params.set('LastName', form.lastName)
        if (form.phone) params.set('Phone', form.phone)
        if (form.email) params.set('Mail', form.email)
      }
      if (form.dedication) params.set('Comment', form.dedication)
      if (paymentMethod === 'hok' && months && months > 0) params.set('Tashlumim', String(months))
    } else {
      // Kesher param names are lowercase (per Kesher docs)
      if (finalAmount) params.set('total', String(finalAmount))
      if (!form.anonymous) {
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
    }
    // Encode the group into addactiondata (campaignId|groupSlug) — Kesher echoes
    // it back as addData on the webhook, so Bit/bank donations get group-attributed
    // even without returning to /thanks (Kesher doesn't echo the raw `group` param).
    params.set('addactiondata', campaign.id + (selectedGroupSlug ? `|${selectedGroupSlug}` : ''))
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
              {step === 'payment'
                ? T.securePay
                : step === 'choice'
                  ? (preStep?.title || T.donorDetails)
                  : (activeForm?.headerTitle?.trim() || T.donorDetails)}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{campaign.title}</p>
          </div>
          <div className="flex items-center gap-3">
            {finalAmount > 0 && (
              <span className="font-black text-base text-left leading-tight" style={{ color: primaryColor }}>
                {sym}{finalAmount.toLocaleString()}
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
        <div className="overflow-y-auto flex-1" onKeyDown={advanceOnEnter}>

          {/* Step: Choice (before the form) */}
          {step === 'choice' && preStep && preStepType === 'choice' && (
            <div className="px-5 py-6 space-y-3">
              <p className="text-center text-sm text-gray-500">{lang === 'en' ? 'Choose an option to continue' : 'בחר אפשרות כדי להמשיך'}</p>
              {preStep.options.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { setChoice(o.label); setActiveFormId(!o.formId || o.formId === 'regular' ? '' : o.formId); setStep('details') }}
                  className="w-full text-right px-4 py-4 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-700 transition-all hover:bg-gray-50"
                  style={{ borderColor: choice === o.label ? primaryColor : undefined, color: choice === o.label ? primaryColor : undefined }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = primaryColor }}
                  onMouseLeave={e => { if (choice !== o.label) e.currentTarget.style.borderColor = '' }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {/* Info / consent pre-step */}
          {step === 'choice' && preStep && (preStepType === 'info' || preStepType === 'consent') && (
            <div className="px-5 py-6 space-y-4">
              {preStepType === 'info' && preStep.image && (
                <img src={preStep.image} alt="" className="w-full max-h-60 object-contain rounded-2xl" />
              )}
              {preStep.body && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line text-center">{preStep.body}</p>
              )}
              {preStepType === 'consent' && (
                <label className="flex items-start gap-2 cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                  <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="w-4 h-4 mt-0.5" style={{ accentColor: primaryColor }} />
                  <span className="text-sm text-gray-700">{preStep.consentLabel || 'אני מאשר/ת'}</span>
                </label>
              )}
              <button
                type="button"
                disabled={preStepType === 'consent' && !consented}
                onClick={() => setStep('details')}
                className={`w-full py-3.5 font-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all ${buttonRadius}`}
                style={{ backgroundColor: primaryColor }}
              >
                {en ? 'Continue' : 'המשך'}
              </button>
            </div>
          )}

          {/* Step: Amount (if no preset) */}
          {step === 'details' && !presetAmount && amount === 0 && !qtyField && (
            <div className="px-5 py-4 border-b border-gray-100">
              <label className="text-xs font-medium text-gray-500 block mb-2">{T.amountLabel}</label>
              <input
                ref={amountRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
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

              {/* בחירה שנעשתה בשלב הקודם — עם אפשרות לשנות */}
              {hasPreStep && choice && (
                <button type="button" onClick={() => setStep('choice')}
                  className="w-full flex items-center justify-between gap-2 text-right px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <span className="font-semibold text-gray-700 truncate">{choice}</span>
                  <span className="text-xs shrink-0" style={{ color: primaryColor }}>{lang === 'en' ? 'Change selection' : 'שנה בחירה'}</span>
                </button>
              )}

              {/* מטבע לתרומה — ₪ עובר בקשר/נדרים, מטבע חוץ עובר ב-Stripe */}
              {stripeEnabled && allowedCurrencies.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">{en ? 'Currency' : 'מטבע לתרומה'}</label>
                  <div className="flex gap-2">
                    {allowedCurrencies.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => changeCurrency(c)}
                        className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                          currency === c ? 'border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        style={currency === c ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                      >
                        {(CURRENCY_SYMBOL[c] || c.toUpperCase())} {c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {isForeign && (
                    <p className="text-[11px] text-gray-400">
                      {en ? 'Paid securely by card via Stripe.' : 'התשלום בכרטיס אשראי דרך Stripe (מאובטח).'}
                    </p>
                  )}
                </div>
              )}

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
                        {m.key === 'bit' ? <BitLogo className="w-5 h-5 rounded shrink-0" /> : <m.Icon className="w-4 h-4 shrink-0" />}
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
                      {sym}{finalAmount.toLocaleString()} {T.perMonth} × {months} {T.months} = <strong className="text-gray-900">{sym}{(finalAmount * months).toLocaleString()}</strong> {T.total}
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

              {/* שדות מותאמים אישית (משלוח וכו') — מוגדרים בקמפיין */}
              {activeForm && activeForm.fields.map(f => {
                const val = customValues[f.id] || ''
                const onChange = (v: string) => setCustomValues(p => ({ ...p, [f.id]: v }))
                return (
                  <div key={f.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">
                      {f.label} {f.required ? <span className="text-red-400">*</span> : <span className="text-gray-300">{T.optional}</span>}
                    </label>
                    {f.type === 'quantity' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => onChange(String(Math.max(1, quantity - 1)))}
                            className="w-9 h-9 rounded-full border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition">−</button>
                          <input type="number" min="1" value={customValues[f.id] || '1'}
                            onChange={e => onChange(e.target.value)} dir="ltr"
                            className="w-16 text-center border border-gray-200 rounded-xl px-2 py-2 text-base font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                          <button type="button" onClick={() => onChange(String(quantity + 1))}
                            className="w-9 h-9 rounded-full border border-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition">+</button>
                        </div>
                        {qtyTotal > 0 && (
                          <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
                            {qtyPrice.discount > 0 && <span className="text-green-600 font-bold">{qtyPrice.discount}% {en ? 'off' : 'הנחה'} · </span>}
                            ₪{qtyUnit.toLocaleString()} {en ? 'each' : 'ליחידה'} × {quantity} = <strong className="text-gray-900">₪{qtyTotal.toLocaleString()}</strong>
                          </p>
                        )}
                        {/* upsell — the next quantity tier that improves the discount */}
                        {(() => {
                          const next = [...(f.tiers || [])].sort((a, b) => a.minQty - b.minQty)
                            .find(t => t.minQty > quantity && (Number(t.discountPercent) || 0) > qtyPrice.discount)
                          if (!next) return null
                          const save = Math.round(qtyBase * next.minQty * (Number(next.discountPercent) || 0) / 100)
                          return (
                            <button type="button" onClick={() => onChange(String(next.minQty))}
                              className="w-full text-center text-xs rounded-lg px-3 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition">
                              {en
                                ? <>Buy {next.minQty} and get {next.discountPercent}% off — save ₪{save.toLocaleString()}</>
                                : <>בחר <strong>{next.minQty} יחידות</strong> וקבל <strong>{next.discountPercent}% הנחה</strong> — תחסוך <strong>₪{save.toLocaleString()}</strong></>}
                            </button>
                          )
                        })()}
                      </div>
                    ) : f.type === 'select' ? (
                      <select value={val} onChange={e => onChange(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">—</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (f.type === 'textarea' || f.type === 'note' || f.type === 'address') ? (
                      <textarea value={val} onChange={e => onChange(e.target.value)} rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                    ) : (
                      <input
                        type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text'}
                        value={val} onChange={e => onChange(e.target.value)}
                        dir={f.type === 'tel' || f.type === 'email' ? 'ltr' : undefined}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                    )}
                  </div>
                )
              })}

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

              {/* הערה אופציונלית מעל כפתור התשלום (לכל טופס או ברירת מחדל) */}
              {(() => {
                const note = (activeForm?.paymentNote || defaultPaymentNote || '').trim()
                return note ? (
                  <p className="text-base text-gray-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 text-center whitespace-pre-line leading-relaxed">{note}</p>
                ) : null
              })()}

              <button
                onClick={() => {
                  persistDonor()
                  // Foreign currency → Stripe embedded checkout; ₪ (incl. Bit/bank)
                  // → the provider's page in the in-modal iframe.
                  if (isForeign) startStripe()
                  else setStep('payment')
                }}
                disabled={!canProceed}
                className={`w-full py-4 font-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all ${buttonRadius}`}
                style={{ backgroundColor: paymentMethod === 'bit' ? '#0A2E36' : primaryColor, color: paymentMethod === 'bit' ? '#37E5E0' : '#fff' }}
              >
                {(() => {
                  const total = paymentMethod === 'hok' ? finalAmount * months : finalAmount
                  return (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold opacity-90">{T.continueToPay}</span>
                      {total > 0 && <span className="text-xl font-black">{sym}{total.toLocaleString()}</span>}
                    </span>
                  )
                })()}
              </button>

              {finalAmount <= 0 && (
                <p className="text-center text-base font-black text-red-500 -mt-1">
                  {en ? 'Please enter a donation amount' : 'נא להזין סכום תרומה'}
                </p>
              )}

              {finalAmount > 0 && !form.anonymous && !detailsValid && (
                <p className="text-center text-xs text-amber-600 -mt-1">
                  {T.fillRequired}
                </p>
              )}

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <span></span> {T.securePay} — {isForeign ? 'Stripe' : paymentProvider === 'nedarim' ? 'נדרים פלוס' : 'קשר'}
              </p>
            </div>
          )}

          {/* Step: Payment (foreign) — Stripe embedded checkout, inline */}
          {step === 'payment' && isForeign && (
            <div className="px-5 py-4 space-y-3">
              <button
                onClick={() => { setStep('details'); setClientSecret(null); setStripePromise(null); setStripeError(null) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {T.backToDetails}
              </button>
              {stripeError ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{stripeError}</p>
                  <button onClick={startStripe} className="text-sm font-bold" style={{ color: primaryColor }}>
                    {en ? 'Try again' : 'נסו שוב'}
                  </button>
                </div>
              ) : clientSecret && stripePromise ? (
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              ) : (
                <div className="py-12 flex items-center justify-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Step: Payment (₪) — the provider's payment page loads in an iframe */}
          {step === 'payment' && !isForeign && (() => {
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
                {paymentMethod === 'bit' && (
                  <div className="mx-4 mt-2 mb-3 rounded-2xl px-4 py-4 text-center shadow-md sticky top-0 z-20" style={{ backgroundColor: '#0A2E36', color: '#fff' }}>
                    <div className="flex justify-center mb-3">
                      <div className="bg-white rounded-xl p-2 shadow-sm">
                        <BitLogo className="w-12 h-12 rounded-lg" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black leading-snug">
                      {en ? 'A payment link will be sent to you by SMS' : 'קישור לתשלום יישלח אליך ב-SMS'}
                    </p>
                    <p className="mt-2.5 text-lg sm:text-xl font-black leading-relaxed" style={{ color: '#37E5E0' }}>
                      {en
                        ? 'Open the link and complete the payment in the Bit app'
                        : 'היכנסו לקישור שנשלח והשלימו את התשלום באפליקציית ביט'}
                    </p>
                    <p className="mt-2.5 text-sm sm:text-base font-bold leading-relaxed" style={{ color: '#d7fbfa' }}>
                      {en
                        ? 'Your donation is recorded only after the Bit payment is completed ✓'
                        : 'רק לאחר השלמת התשלום בביט — התרומה תיכנס לאתר ✓'}
                    </p>
                  </div>
                )}
                {/* taller + scrollable so the provider's buttons are always reachable on mobile */}
                <div className="w-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <iframe
                    src={payUrl}
                    className="w-full"
                    style={{ height: 'min(680px, 74vh)', border: 'none' }}
                    title={T.securePay}
                    allow="payment"
                    scrolling="yes"
                  />
                </div>
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
