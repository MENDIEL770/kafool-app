'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')

  const [form, setForm] = useState({
    kesher_page_id: '',
    kesher_page_url: '',
    kesher_webhook_secret: '',
    kesher_active: false,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single()

      const ctxOrgId = getClientOrgId(profile)
      if (!ctxOrgId) return
      setOrgId(ctxOrgId)

      const { data: org } = await supabase
        .from('organizations')
        .select('kesher_page_id, kesher_page_url, kesher_webhook_secret, kesher_active, slug')
        .eq('id', ctxOrgId)
        .single()

      if (org) {
        setForm({
          kesher_page_id: org.kesher_page_id || '',
          kesher_page_url: org.kesher_page_url || '',
          kesher_webhook_secret: org.kesher_webhook_secret || '',
          kesher_active: org.kesher_active || false,
        })
        // Build webhook URL — canonical www host (the apex 308-redirects and
        // Kesher won't follow it on POST, losing the call).
        const base = (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)
          .replace(/^http:/, 'https:').replace('://kafool.com', '://www.kafool.com')
        setWebhookUrl(`${base}/api/webhooks/kesher`)
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setLoading(true)

    const supabase = createClient()
    await supabase
      .from('organizations')
      .update({
        kesher_page_id: form.kesher_page_id || null,
        kesher_page_url: form.kesher_page_url || null,
        kesher_webhook_secret: form.kesher_webhook_secret || null,
        kesher_active: form.kesher_active,
      })
      .eq('id', orgId)

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות סליקה — קשר</h1>
        <p className="text-gray-500 text-sm mt-1">
          הגדר פעם אחת את פרטי קשר ותרומות יעובדו אוטומטית
        </p>
      </div>

      {/* Instruction card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-blue-800">איך מחברים את קשר?</h2>
        <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
          <li>
            היכנס לחשבון קשר שלך ועבור ל<strong> "פרויקטים ועמודי תשלום"</strong>
          </li>
          <li>
            צור עמוד תשלום חדש או בחר קיים — העתק את <strong>מספר העמוד (Page ID)</strong>
          </li>
          <li>
            הגדר <strong>Webhook</strong> בקשר לכתובת שמופיעה למטה
          </li>
          <li>
            הדבק את הפרטים כאן ולחץ שמור — המערכת תעבוד לבד
          </li>
        </ol>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Webhook URL — read only */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">כתובת ה-Webhook שלך</h3>
          <p className="text-xs text-gray-500">
            העתק כתובת זו והגדר אותה בקשר תחת הגדרות Webhook
          </p>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-sm font-mono text-gray-700 flex-1 break-all" dir="ltr">
              {webhookUrl || 'https://your-domain.com/api/webhooks/kesher'}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl)
                alert('הועתק!')
              }}
              className="text-xs text-blue-600 hover:underline shrink-0 font-medium"
            >
              העתק
            </button>
          </div>
        </div>

        {/* Kesher settings */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">פרטי קשר</h3>

          {/* Page ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              מספר עמוד התשלום (Page ID)
              <span className="text-red-500 mr-1">*</span>
            </label>
            <p className="text-xs text-gray-400">נמצא בקשר תחת "עמודי תשלום" — מספר ליד שם הדף</p>
            <input
              type="text"
              value={form.kesher_page_id}
              onChange={(e) => setForm(p => ({ ...p, kesher_page_id: e.target.value.trim() }))}
              placeholder="לדוגמא: 12345"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          {/* Page URL */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              קישור לעמוד התשלום (URL)
            </label>
            <p className="text-xs text-gray-400">הקישור המלא שקשר נותן לעמוד — אם אין Page ID, ניתן להשתמש בזה</p>
            <input
              type="url"
              value={form.kesher_page_url}
              onChange={(e) => setForm(p => ({ ...p, kesher_page_url: e.target.value.trim() }))}
              placeholder="https://kesherhk.info/PaymentPage/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          {/* Webhook secret */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              מפתח אבטחה (Webhook Secret)
            </label>
            <p className="text-xs text-gray-400">אופציונלי — לאבטחת ה-Webhook. נמצא בהגדרות Webhook בקשר</p>
            <input
              type="password"
              value={form.kesher_webhook_secret}
              onChange={(e) => setForm(p => ({ ...p, kesher_webhook_secret: e.target.value.trim() }))}
              placeholder="••••••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-700">הפעל סליקה</div>
              <div className="text-xs text-gray-400">כאשר מופעל — תורמים יוכלו לשלם דרך קשר</div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, kesher_active: !p.kesher_active }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.kesher_active ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.kesher_active ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status indicator */}
        {form.kesher_page_id && form.kesher_active && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-700 font-medium">הסליקה מוגדרת ומוכנה לקבלת תרומות</span>
          </div>
        )}

        {!form.kesher_page_id && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <span className="text-sm text-yellow-700">הזן Page ID כדי להפעיל את הסליקה</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '✓ נשמר בהצלחה' : loading ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </form>

      {/* How it works */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3">איך זה עובד?</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">1.</span>
            <span>תורם לוחץ "תרום" בדף הקמפיין</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">2.</span>
            <span>נפתח דף תשלום מאובטח של קשר ישירות בתוך האתר</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">3.</span>
            <span>קשר מעבד את התשלום ומדווח ל-Kafool אוטומטית</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">4.</span>
            <span>התרומה מתעדכנת בדשבורד, SMS נשלח לתורם, והיעד מתקדם</span>
          </div>
        </div>
      </div>
    </div>
  )
}
