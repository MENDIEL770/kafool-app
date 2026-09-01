'use client'

import { useState } from 'react'

type Result = {
  hasApiKey?: boolean
  smsSender?: string
  fromSent?: string | null
  yemot?: { responseStatus?: string; message?: string; error?: string; httpStatus?: number }
  error?: string
}

// Super-admin tool: send a test SMS and read Yemot's exact response + the sender
// actually used, to diagnose why the textual sender name isn't appearing.
export default function SmsTestAdmin() {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [r, setR] = useState<Result | null>(null)

  async function send() {
    setBusy(true); setR(null)
    try {
      const res = await fetch('/api/super-admin/sms-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      setR(await res.json())
    } catch (e) {
      setR({ error: String(e) })
    }
    setBusy(false)
  }

  const ok = r?.yemot?.responseStatus === 'OK'
  const diagnosis = (() => {
    if (!r || r.error) return null
    if (!r.hasApiKey) return { tone: 'bad', text: '❌ YEMOT_API_KEY לא מוגדר ב-Vercel.' }
    if (r.yemot?.message?.includes('token')) return { tone: 'bad', text: '❌ מפתח ה-API לא תקף — צור מפתח חדש ב-Yemot ועדכן ב-Vercel.' }
    if (!ok) return { tone: 'bad', text: `❌ Yemot דחה: ${r.yemot?.message || r.yemot?.error || 'שגיאה'} — ייתכן ששם השולח "${r.fromSent}" חסום/לא רשום במרשם.` }
    if (!r.fromSent) return { tone: 'warn', text: '⚠️ נשלח בהצלחה אך בלי שם שולח — SMS_SENDER לא מוגדר ב-Vercel (לכן מגיע ממספר).' }
    return { tone: 'good', text: `✅ נשלח בהצלחה עם השם "${r.fromSent}". אם ההודעה בכל זאת מגיעה ממספר — המפעיל חוסם את השם (מרשם מזהי שולח); צריך לרשום את "${r.fromSent}" מול Yemot.` }
  })()

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 space-y-4" dir="rtl">
      <div>
        <h2 className="text-base font-bold text-gray-900">בדיקת SMS (Yemot)</h2>
        <p className="text-xs text-gray-400 mt-1">שולח הודעת בדיקה דרך הגדרות הפרודקשן ומראה את תגובת Yemot ואת שם השולח בפועל.</p>
      </div>
      <div className="flex gap-2">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0500000000" dir="ltr"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        <button type="button" onClick={send} disabled={busy || !phone.trim()}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          {busy ? 'שולח…' : 'שלח בדיקה'}
        </button>
      </div>

      {r && !r.error && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs space-y-1 text-gray-600">
          <div>מפתח API קיים: <b>{r.hasApiKey ? 'כן' : 'לא'}</b></div>
          <div>SMS_SENDER בפרודקשן: <b>{r.smsSender}</b></div>
          <div>שם שולח שנשלח: <b>{r.fromSent || '(ריק)'}</b></div>
          <div dir="ltr">תגובת Yemot: <code>{JSON.stringify(r.yemot)}</code></div>
        </div>
      )}
      {r?.error && <p className="text-sm text-red-600">{r.error}</p>}
      {diagnosis && (
        <p className={`text-sm font-medium rounded-xl px-3 py-2.5 ${diagnosis.tone === 'good' ? 'bg-emerald-50 text-emerald-700' : diagnosis.tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
          {diagnosis.text}
        </p>
      )}
    </div>
  )
}
