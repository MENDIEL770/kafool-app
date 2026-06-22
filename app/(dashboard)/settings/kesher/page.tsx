'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import { Check, Copy, Info, ExternalLink } from 'lucide-react'

// Generic payment-link fields. Each provider keeps its own copy of these,
// stored in provider-specific DB columns (see COLUMNS below).
const PAYMENT_METHODS = [
  { key: 'one_time',    label: 'תרומה חד"פ',   icon: '', required: true,  hint: 'קישור לדף תשלום רגיל' },
  { key: 'hok',         label: 'הוראת קבע',    icon: '', required: false, hint: 'קישור לדף הוראת קבע' },
  { key: 'bit',         label: 'ביט',           icon: '', required: false, hint: 'קישור לדף תשלום ביט' },
  { key: 'bank',        label: 'העברה בנקאית', icon: '', required: false, hint: 'קישור לדף העברה בנקאית' },
  { key: 'one_time_en', label: 'תרומה חד"פ — אנגלית', icon: '', required: false, hint: 'דף תשלום באנגלית לחד"פ — מוצג כשהתורם עובר לאנגלית' },
  { key: 'hok_en',      label: 'הוראת קבע — אנגלית',  icon: '', required: false, hint: 'דף תשלום באנגלית להו"ק' },
] as const

type PaymentKey = typeof PAYMENT_METHODS[number]['key']
type Provider = 'kesher' | 'nedarim'

// Maps the generic field key → the DB column for each provider.
const COLUMNS: Record<Provider, Record<PaymentKey, string>> = {
  kesher: {
    one_time: 'kesher_page_url', hok: 'kesher_url_hok', bit: 'kesher_url_bit',
    bank: 'kesher_url_bank', one_time_en: 'kesher_page_url_en', hok_en: 'kesher_url_hok_en',
  },
  nedarim: {
    one_time: 'nedarim_page_url', hok: 'nedarim_url_hok', bit: 'nedarim_url_bit',
    bank: 'nedarim_url_bank', one_time_en: 'nedarim_page_url_en', hok_en: 'nedarim_url_hok_en',
  },
}

const emptyUrls = (): Record<PaymentKey, string> => ({
  one_time: '', hok: '', bit: '', bank: '', one_time_en: '', hok_en: '',
})

export default function KesherSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  // '' = no provider chosen yet → the form stays hidden until the user picks one.
  const [provider, setProvider] = useState<Provider | ''>('')
  const [nedarim, setNedarim] = useState({ mosad: '', apiValid: '' })
  // Each provider keeps its own set of links, so switching tabs never mixes them up.
  const [urls, setUrls] = useState<Record<Provider, Record<PaymentKey, string>>>({
    kesher: emptyUrls(),
    nedarim: emptyUrls(),
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
      const ctxOrgId = getClientOrgId(profile)
      if (!ctxOrgId) return
      setOrgId(ctxOrgId)

      const base = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/^http:/, 'https:')
      setWebhookUrl(base + '/api/webhooks/kesher')

      const { data: org } = await supabase
        .from('organizations')
        .select('kesher_page_url, kesher_url_hok, kesher_url_bit, kesher_url_bank, kesher_page_url_en, kesher_url_hok_en, nedarim_page_url, nedarim_url_hok, nedarim_url_bit, nedarim_url_bank, nedarim_page_url_en, nedarim_url_hok_en, payment_provider, nedarim_mosad, nedarim_api_valid')
        .eq('id', ctxOrgId)
        .single()

      if (org) {
        const o = org as Record<string, string>
        const saved = o.payment_provider
        setProvider(saved === 'kesher' || saved === 'nedarim' ? saved : '')
        setNedarim({ mosad: o.nedarim_mosad || '', apiValid: o.nedarim_api_valid || '' })
        const fill = (p: Provider): Record<PaymentKey, string> => {
          const out = emptyUrls()
          for (const m of PAYMENT_METHODS) out[m.key] = o[COLUMNS[p][m.key]] || ''
          return out
        }
        setUrls({ kesher: fill('kesher'), nedarim: fill('nedarim') })
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !provider) return
    setLoading(true)
    const supabase = createClient()
    // Persist both providers' columns so each tab keeps its own links.
    const payload: Record<string, string | boolean | null> = {
      payment_provider:  provider,
      nedarim_mosad:     nedarim.mosad.trim() || null,
      nedarim_api_valid: nedarim.apiValid.trim() || null,
      nedarim_active:    provider === 'nedarim',
      kesher_active:     provider === 'kesher',
    }
    for (const p of ['kesher', 'nedarim'] as Provider[]) {
      for (const m of PAYMENT_METHODS) {
        payload[COLUMNS[p][m.key]] = urls[p][m.key] || null
      }
    }
    const { error } = await supabase.from('organizations').update(payload).eq('id', orgId)
    setLoading(false)
    if (error) { setSaveError(error.message); return }
    setSaveError(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Both providers are link-based now: connected once a one-time payment URL is set.
  const isConnected = !!provider && !!urls[provider].one_time
  // Nedarim posts its CallBack from a server, so use www to avoid a redirect.
  const nedarimWebhookUrl = webhookUrl
    .replace('/api/webhooks/kesher', '/api/webhooks/nedarim')
    .replace('https://kafool.com', 'https://www.kafool.com')

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חיבור לתשלום</h1>
        <p className="text-sm text-gray-400 mt-1">בחר את ספק הסליקה שלך והגדר אותו פעם אחת — התרומות יעובדו אוטומטית לחשבון שלך</p>
      </div>

      {/* בחירת ספק סליקה */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">ספק הסליקה</label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {([['kesher', 'קשר'], ['nedarim', 'נדרים פלוס']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setProvider(val)}
              className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                provider === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt to pick a provider before anything else shows */}
      {!provider && (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
          בחר ספק סליקה למעלה כדי להגדיר את קישורי התשלום שלך.
        </div>
      )}

      {/* Everything below depends on a chosen provider */}
      {provider && (<>
      {/* Status pill */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
        isConnected
          ? 'bg-green-50 border-green-100 text-green-700'
          : 'bg-amber-50 border-amber-100 text-amber-700'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
        {isConnected ? `מחובר ל${provider === 'kesher' ? 'קשר' : 'נדרים פלוס'}` : 'לא מוגדר עדיין'}
      </div>

      {/* Webhook card — קשר בלבד */}
      {provider === 'kesher' && (
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
            onClick={() => copyWebhook(webhookUrl)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'הועתק!' : 'העתק'}
          </button>
        </div>
      </div>
      )}

      {/* Webhook card — נדרים פלוס */}
      {provider === 'nedarim' && (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="font-bold text-blue-800 text-sm">כתובת ה-Webhook שלך (CallBack)</h2>
        </div>
        <p className="text-xs text-blue-600 leading-relaxed">
          הדבק כתובת זו בהגדרות המוסד בנדרים פלוס, בשדה ה-CallBack — כך תרומות יירשמו אוטומטית במערכת.
        </p>
        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-xs font-mono text-gray-600 flex-1 break-all" dir="ltr">{nedarimWebhookUrl}</span>
          <button
            type="button"
            onClick={() => copyWebhook(nedarimWebhookUrl)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'הועתק!' : 'העתק'}
          </button>
        </div>
      </div>
      )}

      {/* Payment form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* ─── קישורי דפי התשלום (לשני הספקים) ─── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-800">קישורי דפי התשלום</h2>
            <p className="text-xs text-gray-400 mt-1">
              הדבק את הקישורים לדפי הסליקה שלך מ{provider === 'nedarim' ? 'נדרים פלוס' : 'קשר'}. תרומה חד&quot;פ הוא חובה, השאר מופיעים כאפשרויות נוספות בדף הגיוס.
            </p>
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
                  {urls[provider][m.key] && (
                    <a href={urls[provider][m.key]} target="_blank" rel="noopener noreferrer" className="mr-auto text-blue-400 hover:text-blue-600 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </label>
                <p className="text-[11px] text-gray-400">{m.hint}</p>
                <input
                  type="url"
                  value={urls[provider][m.key]}
                  onChange={e => setUrls(prev => ({ ...prev, [provider]: { ...prev[provider], [m.key]: e.target.value.trim() } }))}
                  required={m.required}
                  dir="ltr"
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>
        </div>

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            השמירה נכשלה: {saveError}
            {/column .* does not exist|schema cache/i.test(saveError) && ' — צריך להריץ את מיגרציית קישורי האנגלית ב-Supabase.'}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isConnected}
          className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          {saved
            ? <><Check className="w-4 h-4" /> נשמר בהצלחה!</>
            : loading ? 'שומר...' : 'שמור הגדרות'
          }
        </button>
      </form>
      </>)}
    </div>
  )
}
