'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, CheckCircle2, XCircle, Check, SlidersHorizontal } from 'lucide-react'

export default function WhatsAppClient({ partner }: { partner: boolean }) {
  // Platform pricing / idle settings + global on/off
  const [rate, setRate] = useState('')
  const [idleDays, setIdleDays] = useState('')
  const [featureOn, setFeatureOn] = useState(true)
  const [savingCfg, setSavingCfg] = useState(false)
  const [savedCfg, setSavedCfg] = useState(false)
  const [togglingFeature, setTogglingFeature] = useState(false)

  useEffect(() => {
    fetch('/api/super-admin/whatsapp/settings').then(r => r.json()).then(d => {
      if (d && !d.error) { setRate(String(d.dailyRate)); setIdleDays(String(d.idleDeleteDays)); setFeatureOn(d.featureEnabled !== false) }
    }).catch(() => {})
  }, [])

  async function postSettings(patch: { daily_rate?: number; idle_delete_days?: number; feature_enabled?: boolean }) {
    const r = await fetch('/api/super-admin/whatsapp/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_rate: Number(rate), idle_delete_days: Number(idleDays), feature_enabled: featureOn, ...patch }),
    }).then(x => x.json())
    if (r && !r.error) { setRate(String(r.dailyRate)); setIdleDays(String(r.idleDeleteDays)); setFeatureOn(r.featureEnabled !== false) }
    return r
  }

  async function toggleFeature() {
    const next = !featureOn
    setTogglingFeature(true); setFeatureOn(next)
    await postSettings({ feature_enabled: next }).catch(() => setFeatureOn(!next))
    setTogglingFeature(false)
  }

  async function saveCfg() {
    setSavingCfg(true)
    try { const r = await postSettings({}); if (r && !r.error) { setSavedCfg(true); setTimeout(() => setSavedCfg(false), 2000) } } catch { /* ignore */ }
    setSavingCfg(false)
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

      {/* Global on/off for the whole feature */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900">חיבור וואטסאפ — הפעלה לכל הלקוחות</h2>
          <p className="text-xs text-gray-400 mt-0.5">{featureOn ? 'פעיל — מנהלי הקמפיינים רואים ויכולים לחבר וואטסאפ.' : 'כבוי — האפשרות מוסתרת מכל הלקוחות.'}</p>
        </div>
        <button onClick={toggleFeature} disabled={togglingFeature} role="switch" aria-checked={featureOn}
          className={`relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50 ${featureOn ? 'bg-emerald-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${featureOn ? 'left-1' : 'left-7'}`} />
        </button>
      </div>

      {/* Partner integration status */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${partner ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
        {partner ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <XCircle className="w-6 h-6 text-amber-600 shrink-0" />}
        <div>
          <div className="font-bold text-gray-900">{partner ? 'אינטגרציית Partner מוגדרת' : 'אינטגרציית Partner לא מוגדרת'}</div>
          <div className="text-xs text-gray-500">
            {partner
              ? 'כל ארגון מחבר את המספר שלו בעצמו (הגדרות → חיבור וואטסאפ → סריקת QR). אין צורך בחיבור מספר יחיד כאן.'
              : 'הגדירו את GREENAPI_PARTNER_TOKEN ב-Vercel כדי לאפשר חיבור פר-ארגון.'}
          </div>
        </div>
      </div>

      {/* Pricing / idle settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-1"><SlidersHorizontal className="w-4 h-4 text-gray-400" /> תמחור ומחיקה אוטומטית</h2>
        <p className="text-xs text-gray-400 mb-3">המחיר שיוצג למנהלים לכל יום שליחה, וכמה ימי חוסר-שימוש עד שמספר לא פעיל יימחק אוטומטית (כדי לא לשלם עליו).</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">מחיר ליום (₪)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} dir="ltr" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">מחיקה אוטומטית אחרי (ימי חוסר-שימוש)</label>
            <input type="number" value={idleDays} onChange={e => setIdleDays(e.target.value)} dir="ltr" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <button onClick={saveCfg} disabled={savingCfg} className="mt-3 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
          {savedCfg ? <><Check className="w-4 h-4" /> נשמר!</> : savingCfg ? 'שומר…' : 'שמירת הגדרות'}
        </button>
      </div>

      {/* How it works (partner model) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <h2 className="font-bold text-gray-800">איך זה עובד</h2>
        <ol className="text-sm text-gray-600 space-y-1.5 list-decimal pr-5">
          <li>ה-<span className="font-mono text-xs bg-gray-100 rounded px-1">GREENAPI_PARTNER_TOKEN</span> מוגדר ב-Vercel (פעם אחת).</li>
          <li>כל מנהל נכנס ל<span className="font-semibold">הגדרות → חיבור וואטסאפ</span>, לוחץ ״התחברות״, וסורק QR עם המספר שלו — הכל בתוך האתר.</li>
          <li>המנהל מפעיל את השירות לכמה ימים; המערכת סופרת ימים ומחשבת עלות לפי המחיר שנקבע למעלה.</li>
          <li>מספרים לא-בשימוש נמחקים אוטומטית (לפי ״ימי חוסר-שימוש״) כדי לא להצטבר חיוב.</li>
        </ol>
      </div>
    </div>
  )
}
