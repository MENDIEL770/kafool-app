'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Info, ExternalLink } from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'kesher_page_url', label: 'תרומה חד"פ',   icon: '💳', required: true,  hint: 'קישור לדף תשלום רגיל' },
  { key: 'kesher_url_hok',  label: 'הוראת קבע',    icon: '🔄', required: false, hint: 'קישור לדף הוראת קבע' },
  { key: 'kesher_url_bit',  label: 'ביט',           icon: '📱', required: false, hint: 'קישור לדף תשלום ביט' },
  { key: 'kesher_url_bank', label: 'העברה בנקאית', icon: '🏦', required: false, hint: 'קישור לדף העברה בנקאית' },
] as const

type PaymentKey = typeof PAYMENT_METHODS[number]['key']

export default function KesherSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [urls, setUrls] = useState<Record<PaymentKey, string>>({
    kesher_page_url: '',
    kesher_url_hok: '',
    kesher_url_bit: '',
    kesher_url_bank: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile?.org_id) return
      setOrgId(profile.org_id)

      const base = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/^http:/, 'https:')
      setWebhookUrl(base + '/api/webhooks/kesher')

      const { data: org } = await supabase
        .from('organizations')
        .select('kesher_page_url, kesher_url_hok, kesher_url_bit, kesher_url_bank')
        .eq('id', profile.org_id)
        .single()

      if (org) {
        setUrls({
          kesher_page_url: (org as Record<string, string>).kesher_page_url || '',
          kesher_url_hok:  (org as Record<string, string>).kesher_url_hok  || '',
          kesher_url_bit:  (org as Record<string, string>).kesher_url_bit  || '',
          kesher_url_bank: (org as Record<string, string>).kesher_url_bank || '',
        })
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('organizations').update({
      kesher_page_url: urls.kesher_page_url || null,
      kesher_url_hok:  urls.kesher_url_hok  || null,
      kesher_url_bit:  urls.kesher_url_bit  || null,
      kesher_url_bank: urls.kesher_url_bank || null,
    }).eq('id', orgId)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected = !!urls.kesher_page_url

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חיבור קשר</h1>
        <p className="text-sm text-gray-400 mt-1">הגדר את קישורי התשלום פעם אחת — קשר יעבד את התרומות ישירות לחשבון שלך</p>
      </div>

      {/* Status pill */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
        isConnected
          ? 'bg-green-50 border-green-100 text-green-700'
          : 'bg-amber-50 border-amber-100 text-amber-700'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
        {isConnected ? 'מחובר לקשר' : 'לא מוגדר עדיין'}
      </div>

      {/* Webhook card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="font-bold text-blue-800 text-sm">כתובת ה-Webhook שלך</h2>
        </div>
        <p className="text-xs text-blue-600 leading-relaxed">
          הזן כתובת זו בלוח הבקרה של קשר:<br />
          <span className="font-semibold">הגדרות חברה ← שירותי MRC כללי ← Webhook URL</span>
        </p>
        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-xs font-mono text-gray-600 flex-1 break-all" dir="ltr">{webhookUrl}</span>
          <button
            type="button"
            onClick={copyWebhook}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'הועתק!' : 'העתק'}
          </button>
        </div>
      </div>

      {/* Payment URLs form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-800">קישורי תשלום</h2>
            <p className="text-xs text-gray-400 mt-1">הדבק את הקישורים שקיבלת מקשר. תרומה חד&quot;פ הוא חובה, השאר מופיעים כאפשרויות נוספות בדף הגיוס.</p>
          </div>

          <div className="space-y-4">
            {PAYMENT_METHODS.map(m => (
              <div key={m.key} className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span>{m.icon}</span>
                  {m.label}
                  {m.required
                    ? <span className="text-red-400 text-xs font-medium">חובה</span>
                    : <span className="text-gray-300 text-xs font-normal">אופציונלי</span>
                  }
                  {urls[m.key] && (
                    <a href={urls[m.key]} target="_blank" rel="noopener noreferrer" className="mr-auto text-blue-400 hover:text-blue-600 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </label>
                <p className="text-[11px] text-gray-400">{m.hint}</p>
                <input
                  type="url"
                  value={urls[m.key]}
                  onChange={e => setUrls(p => ({ ...p, [m.key]: e.target.value.trim() }))}
                  required={m.required}
                  dir="ltr"
                  placeholder="https://kesherhk.info/PaymentPage/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !urls.kesher_page_url}
          className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          {saved
            ? <><Check className="w-4 h-4" /> נשמר בהצלחה!</>
            : loading ? 'שומר...' : 'שמור הגדרות'
          }
        </button>
      </form>
    </div>
  )
}
