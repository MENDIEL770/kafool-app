'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientOrgId } from '@/lib/tenancy-client'
import { MessageCircle, CheckCircle2, XCircle, Send, Check } from 'lucide-react'

export default function OrgWhatsAppPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [idInstance, setIdInstance] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [to, setTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
      const oid = getClientOrgId(profile)
      if (!oid) { setLoading(false); return }
      setOrgId(oid)
      try {
        const { data: org } = await supabase.from('organizations').select('whatsapp_config').eq('id', oid).maybeSingle()
        const cfg = (org as { whatsapp_config?: { green?: { id?: string; token?: string } } } | null)?.whatsapp_config
        if (cfg?.green?.id) { setIdInstance(cfg.green.id); setConnected(true) }
        if (cfg?.green?.token) setApiToken(cfg.green.token)
      } catch { /* column may not exist yet */ }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (!orgId) return
    setSaving(true); setTestResult(null)
    const whatsapp_config = idInstance.trim() && apiToken.trim()
      ? { provider: 'green', green: { id: idInstance.trim(), token: apiToken.trim() } }
      : null
    const { error } = await supabase.from('organizations').update({ whatsapp_config }).eq('id', orgId)
    setSaving(false)
    if (error) { setTestResult({ ok: false, msg: 'השמירה נכשלה: ' + error.message }); return }
    setConnected(!!whatsapp_config)
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function sendTest() {
    if (!to.trim()) return
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      setTestResult(res.ok ? { ok: true, msg: 'נשלח! בדוק את הוואטסאפ שלך.' } : { ok: false, msg: d.error || 'השליחה נכשלה' })
    } catch { setTestResult({ ok: false, msg: 'השליחה נכשלה' }) }
    setTesting(false)
  }

  const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400'
  if (loading) return <div className="p-6 text-sm text-gray-400" dir="rtl">טוען…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
          חיבור וואטסאפ
        </h1>
        <p className="text-sm text-gray-500 mt-1">חברו את הוואטסאפ שלכם — ההודעות לתורמים ולמנהלי הקבוצות יישלחו מהמספר שלכם.</p>
      </div>

      {/* Status */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${connected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        {connected ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <XCircle className="w-6 h-6 text-amber-600 shrink-0" />}
        <div className="text-sm">
          <div className="font-bold text-gray-900">{connected ? 'מחובר' : 'לא מחובר'}</div>
          <div className="text-gray-500 text-xs">{connected ? 'הודעות תודה יישלחו אוטומטית בסיום תרומה.' : 'מלאו את הפרטים למטה כדי להתחבר.'}</div>
        </div>
      </div>

      {/* Connect form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-800">פרטי חיבור (GreenAPI)</h2>
        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">idInstance</label>
          <input value={idInstance} onChange={e => setIdInstance(e.target.value)} dir="ltr" className={field} placeholder="1101xxxxxx" /></div>
        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">apiTokenInstance</label>
          <input value={apiToken} onChange={e => setApiToken(e.target.value)} dir="ltr" className={field} placeholder="xxxxxxxxxxxxxxxxxxxx" /></div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
          {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : 'שמירת חיבור'}
        </button>
      </div>

      {/* Test */}
      {connected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-1">בדיקת חיבור</h2>
          <p className="text-xs text-gray-400 mb-3">שלחו הודעת בדיקה למספר שלכם.</p>
          <div className="flex gap-2">
            <input value={to} onChange={e => setTo(e.target.value)} dir="ltr" placeholder="0501234567" className={field} />
            <button onClick={sendTest} disabled={testing || !to.trim()} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 whitespace-nowrap">
              <Send className="w-4 h-4" /> {testing ? 'שולח…' : 'שלח בדיקה'}
            </button>
          </div>
          {testResult && <div className={`mt-3 text-sm rounded-xl px-3 py-2 ${testResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{testResult.msg}</div>}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-2">איך משיגים את הפרטים (5 דקות)</h2>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal pr-5">
          <li>היכנסו ל-<a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">green-api.com</a> וצרו חשבון (יש תוכנית חינם).</li>
          <li>צרו <span className="font-semibold">Instance</span> חדש → <span className="font-semibold">סרקו את ה-QR</span> עם מספר הוואטסאפ שלכם (כמו WhatsApp Web).</li>
          <li>העתיקו את <span className="font-mono text-xs bg-gray-100 rounded px-1">idInstance</span> ו-<span className="font-mono text-xs bg-gray-100 rounded px-1">apiTokenInstance</span> אל השדות למעלה ולחצו שמירה.</li>
          <li>שלחו הודעת בדיקה לעצמכם — וזהו! 🎉</li>
        </ol>
      </div>
    </div>
  )
}
