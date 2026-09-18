'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle2, XCircle, Send } from 'lucide-react'

const PROVIDER_LABEL: Record<string, string> = {
  green: 'GreenAPI', ultramsg: 'UltraMsg', meta: 'Meta Cloud API (רשמי)',
}

export default function WhatsAppClient({ provider }: { provider: string | null }) {
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function sendTest() {
    if (!to.trim()) return
    setBusy(true); setResult(null)
    try {
      const res = await fetch('/api/super-admin/whatsapp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      setResult(res.ok ? { ok: true, msg: 'נשלח! בדוק את הוואטסאפ שלך.' } : { ok: false, msg: d.error || 'השליחה נכשלה' })
    } catch { setResult({ ok: false, msg: 'השליחה נכשלה' }) }
    setBusy(false)
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <span className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
          חיבור וואטסאפ
        </h1>
        <p className="text-sm text-gray-400 mt-1">שליחת תודות ותזכורות בוואטסאפ לתורמים ולמנהלי קבוצות.</p>
      </div>

      {/* Status */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${provider ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        {provider ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <XCircle className="w-6 h-6 text-amber-600 shrink-0" />}
        <div>
          <div className="font-bold text-gray-900">{provider ? `מחובר · ${PROVIDER_LABEL[provider] || provider}` : 'לא מחובר'}</div>
          <div className="text-xs text-gray-500">{provider ? 'הודעות וואטסאפ יישלחו אוטומטית בסיום תרומה.' : 'הגדירו את משתני הסביבה כדי להפעיל (ראו למטה).'}</div>
        </div>
      </div>

      {/* Test send */}
      {provider && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-1">בדיקת חיבור</h2>
          <p className="text-xs text-gray-400 mb-3">שלח הודעת בדיקה למספר שלך כדי לוודא שהחיבור עובד.</p>
          <div className="flex gap-2">
            <input value={to} onChange={e => setTo(e.target.value)} dir="ltr" placeholder="0501234567"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            <button onClick={sendTest} disabled={busy || !to.trim()}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
              <Send className="w-4 h-4" /> {busy ? 'שולח…' : 'שלח בדיקה'}
            </button>
          </div>
          {result && <div className={`mt-3 text-sm rounded-xl px-3 py-2 ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{result.msg}</div>}
        </div>
      )}

      {/* Setup instructions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-800">איך מחברים מספר וואטסאפ קיים (GreenAPI)</h2>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal pr-5">
          <li>היכנסו ל-<a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">green-api.com</a> וצרו חשבון (יש תוכנית חינם).</li>
          <li>צרו <span className="font-semibold">Instance</span> חדש, ובמסך שלו <span className="font-semibold">סרקו את ה-QR</span> עם המספר הקיים שלכם (כמו WhatsApp Web).</li>
          <li>העתיקו את <span className="font-mono text-xs bg-gray-100 rounded px-1">idInstance</span> ואת <span className="font-mono text-xs bg-gray-100 rounded px-1">apiTokenInstance</span>.</li>
          <li>ב-Vercel → Settings → Environment Variables, הוסיפו:
            <div className="mt-1.5 font-mono text-[11px] bg-gray-900 text-gray-100 rounded-xl p-3 leading-relaxed" dir="ltr">
              WHATSAPP_PROVIDER=green<br />GREENAPI_ID_INSTANCE=&lt;idInstance&gt;<br />GREENAPI_API_TOKEN=&lt;apiTokenInstance&gt;
            </div>
          </li>
          <li>עשו <span className="font-semibold">Redeploy</span>, חזרו לכאן, ושלחו הודעת בדיקה.</li>
        </ol>
        <p className="text-[11px] text-gray-400">בעתיד, כשתקנו מספר ייעודי ותרצו את החיבור הרשמי של Meta — פשוט נחליף ל-<span className="font-mono">WHATSAPP_PROVIDER=meta</span> עם הפרטים שלו, בלי שינוי קוד.</p>
      </div>
    </div>
  )
}
