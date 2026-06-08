'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { encryptPassword, decryptPassword } from '@/lib/kesher/crypto'
import { Check, Eye, EyeOff, Info, Link } from 'lucide-react'

const PAYMENT_METHODS = [
  { key: 'kesher_page_url',    label: 'תרומה חד"פ',        icon: '💳', required: true,  hint: 'קישור לדף תשלום רגיל בקשר' },
  { key: 'kesher_url_hok',     label: 'הוראת קבע',         icon: '🔄', required: false, hint: 'קישור לדף הוראת קבע בקשר' },
  { key: 'kesher_url_bit',     label: 'ביט',                icon: '📱', required: false, hint: 'קישור לדף תשלום ביט' },
  { key: 'kesher_url_bank',    label: 'העברה בנקאית',      icon: '🏦', required: false, hint: 'קישור לדף העברה בנקאית' },
] as const

type PaymentKey = typeof PAYMENT_METHODS[number]['key']

export default function KesherSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [conn, setConn] = useState({
    kesher_username: '',
    kesher_password: '',
    project_number: '',
    payment_page_id: '',
    is_active: true,
  })
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

      const rawBase = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      setWebhookUrl(rawBase.replace(/^http:/, 'https:') + '/api/webhooks/kesher')

      // Load kesher connection credentials
      const { data: c } = await supabase
        .from('kesher_connections')
        .select('*')
        .eq('org_id', profile.org_id)
        .single()

      if (c) {
        setConn({
          kesher_username: c.kesher_username || '',
          kesher_password: decryptPassword(c.kesher_password_encrypted || ''),
          project_number: c.project_number || '',
          payment_page_id: String(c.payment_page_id || ''),
          is_active: c.is_active ?? true,
        })
      }

      // Load payment URLs from organizations
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
    const encrypted = conn.kesher_password ? encryptPassword(conn.kesher_password) : ''

    // Save credentials
    await supabase.from('kesher_connections').upsert({
      org_id: orgId,
      kesher_username: conn.kesher_username,
      kesher_password_encrypted: encrypted,
      project_number: conn.project_number,
      payment_page_id: Number(conn.payment_page_id),
      is_active: conn.is_active,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })

    // Save payment URLs to organizations
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

  function setC(key: string, value: string | boolean) { setConn(p => ({ ...p, [key]: value })) }
  function setUrl(key: PaymentKey, value: string) { setUrls(p => ({ ...p, [key]: value })) }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">חיבור לקשר</h1>
        <p className="text-gray-500 text-sm mt-1">הגדר פעם אחת — קשר יעבד תרומות ישירות לחשבון שלך</p>
      </div>

      {/* Webhook URL */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-blue-800 flex items-center gap-2">
          <Info className="w-4 h-4" />
          כתובת ה-Webhook שלך
        </h2>
        <p className="text-xs text-blue-600">הזן כתובת זו בממשק ניהול קשר: הגדרות חברה ← שירותי MRC כללי ← Webhook URL</p>
        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm font-mono text-gray-700 flex-1 break-all" dir="ltr">{webhookUrl}</span>
          <button type="button" onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="text-xs text-blue-600 hover:underline font-medium shrink-0">
            העתק
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Credentials */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-gray-800">פרטי חיבור</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">שם משתמש קשר</label>
              <input value={conn.kesher_username} onChange={e => setC('kesher_username', e.target.value)}
                placeholder="username@example.com" dir="ltr" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">סיסמה</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={conn.kesher_password}
                  onChange={e => setC('kesher_password', e.target.value)}
                  placeholder="••••••••" dir="ltr" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">מספר פרויקט</label>
              <p className="text-[11px] text-gray-400">נמצא בלוח הבקרה של קשר</p>
              <input value={conn.project_number} onChange={e => setC('project_number', e.target.value)}
                placeholder="12345" dir="ltr" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">מזהה דף תשלום (Page ID)</label>
              <p className="text-[11px] text-gray-400">תחת "עמודי תשלום" בקשר</p>
              <input type="number" value={conn.payment_page_id} onChange={e => setC('payment_page_id', e.target.value)}
                placeholder="678" dir="ltr" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-700">הפעל סליקה</div>
              <div className="text-xs text-gray-400">כאשר כבוי — כפתור התרומה לא יפעל</div>
            </div>
            <button type="button" onClick={() => setC('is_active', !conn.is_active)}
              className={`relative w-12 h-6 rounded-full transition-colors ${conn.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${conn.is_active ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Payment URLs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Link className="w-4 h-4 text-gray-400" />
              קישורי תשלום
            </h2>
            <p className="text-xs text-gray-400 mt-1">הדבק את הקישורים שקיבלת מקשר לכל סוג תשלום. תרומה חד"פ הוא חובה, השאר אופציונליים.</p>
          </div>

          {PAYMENT_METHODS.map(m => (
            <div key={m.key} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span>{m.icon}</span>
                {m.label}
                {m.required
                  ? <span className="text-red-500 text-xs">חובה</span>
                  : <span className="text-gray-300 text-xs">אופציונלי</span>
                }
              </label>
              <p className="text-[11px] text-gray-400">{m.hint}</p>
              <input
                type="url"
                value={urls[m.key]}
                onChange={e => setUrl(m.key, e.target.value.trim())}
                required={m.required}
                dir="ltr"
                placeholder="https://kesherhk.info/PaymentPage/..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          ))}
        </div>

        {conn.kesher_username && conn.payment_page_id && conn.is_active && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-700 font-medium">הסליקה מוגדרת ומוכנה</span>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> נשמר!</> : loading ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </form>

      {/* Migration notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 space-y-1">
        <p className="font-bold">⚠️ נדרשת הרצת Migration</p>
        <p>כדי לשמור קישורי הוראת קבע / ביט / העברה בנקאית, יש להריץ את הקובץ <code>supabase/add_payment_urls.sql</code> בממשק SQL של Supabase.</p>
      </div>
    </div>
  )
}
