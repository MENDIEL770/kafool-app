'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Per-org Stripe connection (foreign-currency donations). Secret keys are
// write-only: we never read them back, only whether they're set.
export default function StripeConnectCard() {
  const [connected, setConnected] = useState(false)
  const [hasWebhook, setHasWebhook] = useState(false)
  const [hasPublishable, setHasPublishable] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadStatus() {
    try {
      const r = await fetch('/api/org/stripe')
      const d = await r.json()
      setConnected(!!d.connected)
      setHasWebhook(!!d.hasWebhook)
      setHasPublishable(!!d.hasPublishable)
      setWebhookUrl(d.webhookUrl || '')
    } catch { /* ignore */ }
  }
  useEffect(() => { loadStatus() }, [])

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const payload: Record<string, string> = {}
      if (secretKey.trim()) payload.secretKey = secretKey.trim()
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim()
      if (publishableKey.trim()) payload.publishableKey = publishableKey.trim()
      if (Object.keys(payload).length === 0) { setSaving(false); return }
      const r = await fetch('/api/org/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'השמירה נכשלה'); setSaving(false); return }
      setSecretKey(''); setWebhookSecret(''); setPublishableKey(''); setSaved(true)
      await loadStatus()
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('השמירה נכשלה')
    }
    setSaving(false)
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="text-lg">🌍</span> Stripe — תרומות מחו״ל (בינלאומי)
        </h3>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${connected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {connected ? 'מחובר' : 'לא מחובר'}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        חבר את חשבון ה-Stripe שלך לקבלת תרומות במטבע חוץ (למשל $). את המפתחות תמצא ב-Stripe → Developers → API keys.
        לאחר החיבור — הפעל &quot;תרומות מחו״ל&quot; בהגדרות של כל קמפיין שתרצה.
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">מפתח סודי (Secret key)</label>
          <input
            type="password"
            value={secretKey}
            onChange={e => setSecretKey(e.target.value)}
            dir="ltr"
            placeholder={connected ? '•••••••••• (שמור — הזן חדש כדי להחליף)' : 'sk_live_...'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">סוד Webhook (Signing secret)</label>
          <input
            type="password"
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            dir="ltr"
            placeholder={hasWebhook ? '•••••••••• (שמור — הזן חדש כדי להחליף)' : 'whsec_...'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">מפתח ציבורי (Publishable key)</label>
          <input
            type="text"
            value={publishableKey}
            onChange={e => setPublishableKey(e.target.value)}
            dir="ltr"
            placeholder={hasPublishable ? '•••••••••• (שמור — הזן חדש כדי להחליף)' : 'pk_live_...'}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-[11px] text-gray-400">ציבורי (לא סודי) — נדרש כדי לטעון את דף התשלום בתוך האתר.</p>
        </div>
      </div>

      {/* Webhook URL to register in Stripe */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-1.5">
        <div className="text-xs font-bold text-blue-700">כתובת ה-Webhook לרישום ב-Stripe</div>
        <div className="text-[11px] text-gray-500">Stripe → Developers → Webhooks → Add endpoint · אירועים: <code>checkout.session.completed</code> + <code>invoice.paid</code> (להו״ק)</div>
        <div className="flex items-center gap-2">
          <input readOnly value={webhookUrl} dir="ltr" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600" />
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'הועתק' : 'העתק'}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

      <button
        type="button"
        onClick={save}
        disabled={saving || (!secretKey.trim() && !webhookSecret.trim() && !publishableKey.trim())}
        className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #635bff, #4f46e5)' }}
      >
        {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר...' : 'שמור חיבור Stripe'}
      </button>
    </div>
  )
}
