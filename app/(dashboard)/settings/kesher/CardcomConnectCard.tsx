'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Per-org CardCom connection. Terminal is a plain identifier; API name + password
// are write-only (encrypted server-side), we only report whether they're set.
export default function CardcomConnectCard() {
  const [terminal, setTerminal] = useState('')
  const [apiName, setApiName] = useState('')
  const [apiPassword, setApiPassword] = useState('')
  const [hasApiName, setHasApiName] = useState(false)
  const [hasApiPassword, setHasApiPassword] = useState(false)
  const [active, setActive] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadStatus() {
    try {
      const d = await fetch('/api/org/cardcom').then(r => r.json())
      setTerminal(d.terminal || '')
      setHasApiName(!!d.hasApiName)
      setHasApiPassword(!!d.hasApiPassword)
      setActive(!!d.active)
      setWebhookUrl(d.webhookUrl || '')
    } catch { /* ignore */ }
  }
  useEffect(() => { loadStatus() }, [])

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const payload: Record<string, string | boolean> = { terminal: terminal.trim(), active: true }
      if (apiName.trim()) payload.apiName = apiName.trim()
      if (apiPassword.trim()) payload.apiPassword = apiPassword.trim()
      const r = await fetch('/api/org/cardcom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'השמירה נכשלה'); setSaving(false); return }
      setApiPassword(''); setApiName(''); setSaved(true)
      await loadStatus()
      setTimeout(() => setSaved(false), 2500)
    } catch { setError('השמירה נכשלה') }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><span className="text-lg">💳</span> חיבור CardCom</h3>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${active && hasApiName ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${active && hasApiName ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {active && hasApiName ? 'מחובר' : 'לא מחובר'}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        הזן את פרטי ה-API של CardCom. תמצא אותם ב-CardCom → ניהול מפתחות API (ApiName / ApiPassword) ומספר המסוף (Terminal).
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">מספר מסוף (Terminal)</label>
          <input type="text" value={terminal} onChange={e => setTerminal(e.target.value.replace(/[^\d]/g, ''))} dir="ltr" placeholder="1000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">שם API (ApiName)</label>
          <input type="password" value={apiName} onChange={e => setApiName(e.target.value)} dir="ltr" placeholder={hasApiName ? '•••••••• (שמור — הזן חדש כדי להחליף)' : 'ApiName'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">סיסמת API (ApiPassword) — לזיכויים/ביטולים</label>
          <input type="password" value={apiPassword} onChange={e => setApiPassword(e.target.value)} dir="ltr" placeholder={hasApiPassword ? '•••••••• (שמור — הזן חדש כדי להחליף)' : 'ApiPassword (אופציונלי)'} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-1.5">
        <div className="text-xs font-bold text-blue-700">כתובת ה-Webhook לרישום ב-CardCom</div>
        <div className="text-[11px] text-gray-500">הגדר ב-CardCom כ-WebHookUrl של דף הסליקה (נשלח אוטומטית בכל עסקה).</div>
        <div className="flex items-center gap-2">
          <input readOnly value={webhookUrl} dir="ltr" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600" />
          <button type="button" onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'הועתק' : 'העתק'}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

      <button type="button" onClick={save} disabled={saving || !terminal.trim() || (!hasApiName && !apiName.trim())} className="w-full py-3 rounded-2xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700">
        {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר...' : 'שמור חיבור CardCom'}
      </button>
    </div>
  )
}
