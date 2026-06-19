'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Info, ExternalLink } from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'kesher_page_url', label: 'תרומה חד"פ',   icon: '', required: true,  hint: 'קישור לדף תשלום רגיל' },
  { key: 'kesher_url_hok',  label: 'הוראת קבע',    icon: '', required: false, hint: 'קישור לדף הוראת קבע' },
  { key: 'kesher_url_bit',  label: 'ביט',           icon: '', required: false, hint: 'קישור לדף תשלום ביט' },
  { key: 'kesher_url_bank', label: 'העברה בנקאית', icon: '', required: false, hint: 'קישור לדף העברה בנקאית' },
  { key: 'kesher_page_url_en', label: 'תרומה חד"פ — אנגלית', icon: '', required: false, hint: 'דף תשלום באנגלית לחד"פ — מוצג כשהתורם עובר לאנגלית' },
  { key: 'kesher_url_hok_en',  label: 'הוראת קבע — אנגלית',  icon: '', required: false, hint: 'דף תשלום באנגלית להו"ק' },
] as const

type PaymentKey = typeof PAYMENT_METHODS[number]['key']

export default function KesherSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [provider, setProvider] = useState<'kesher' | 'nedarim'>('kesher')
  const [nedarim, setNedarim] = useState({ mosad: '', apiValid: '' })
  const [urls, setUrls] = useState<Record<PaymentKey, string>>({
    kesher_page_url: '',
    kesher_url_hok: '',
    kesher_url_bit: '',
    kesher_url_bank: '',
    kesher_page_url_en: '',
    kesher_url_hok_en: '',
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
        .select('kesher_page_url, kesher_url_hok, kesher_url_bit, kesher_url_bank, kesher_page_url_en, kesher_url_hok_en, payment_provider, nedarim_mosad, nedarim_api_valid')
        .eq('id', profile.org_id)
        .single()

      if (org) {
        const o = org as Record<string, string>
        setProvider((o.payment_provider as 'kesher' | 'nedarim') || 'kesher')
        setNedarim({ mosad: o.nedarim_mosad || '', apiValid: o.nedarim_api_valid || '' })
        setUrls({
          kesher_page_url: o.kesher_page_url || '',
          kesher_url_hok:  o.kesher_url_hok  || '',
          kesher_url_bit:  o.kesher_url_bit  || '',
          kesher_url_bank: o.kesher_url_bank || '',
          kesher_page_url_en: o.kesher_page_url_en || '',
          kesher_url_hok_en:  o.kesher_url_hok_en  || '',
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
    const { error } = await supabase.from('organizations').update({
      payment_provider: provider,
      kesher_page_url: urls.kesher_page_url || null,
      kesher_url_hok:  urls.kesher_url_hok  || null,
      kesher_url_bit:  urls.kesher_url_bit  || null,
      kesher_url_bank: urls.kesher_url_bank || null,
      kesher_page_url_en: urls.kesher_page_url_en || null,
      kesher_url_hok_en:  urls.kesher_url_hok_en  || null,
      nedarim_mosad:     nedarim.mosad.trim() || null,
      nedarim_api_valid: nedarim.apiValid.trim() || null,
      nedarim_active:    provider === 'nedarim',
    }).eq('id', orgId)
    setLoading(false)
    if (error) { setSaveError(error.message); return }
    setSaveError(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected = provider === 'kesher' ? !!urls.kesher_page_url : (!!nedarim.mosad && !!nedarim.apiValid)

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
            onClick={copyWebhook}
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
        {/* ─── קשר: קישורי תשלום ─── */}
        {provider === 'kesher' && (
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
        )}

        {/* ─── נדרים פלוס: פרטי מוסד ─── */}
        {provider === 'nedarim' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-800">פרטי נדרים פלוס</h2>
            <p className="text-xs text-gray-400 mt-1">הזן את מזהה המוסד וקוד האימות שקיבלת מנדרים פלוס. דף הסליקה ייטען מאובטח בתוך האתר.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">מזהה מוסד (Mosad) <span className="text-red-400 text-xs">חובה</span></label>
              <p className="text-[11px] text-gray-400">7 ספרות — מזהה המוסד שלך בנדרים פלוס</p>
              <input
                value={nedarim.mosad}
                onChange={e => setNedarim(p => ({ ...p, mosad: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                dir="ltr" placeholder="1234567"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">קוד אימות (ApiValid) <span className="text-red-400 text-xs">חובה</span></label>
              <p className="text-[11px] text-gray-400">קוד האימות שמקבלים מנדרים פלוס (בפנייה לשירות הלקוחות ממייל מורשה)</p>
              <input
                value={nedarim.apiValid}
                onChange={e => setNedarim(p => ({ ...p, apiValid: e.target.value.trim() }))}
                dir="ltr" placeholder="••••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>
        )}

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
    </div>
  )
}
