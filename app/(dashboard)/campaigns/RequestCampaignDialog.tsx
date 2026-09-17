'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Heart, Feather, ShoppingBag, ShieldCheck, MessageCircle, Check, ArrowRight } from 'lucide-react'

// Platform admin WhatsApp (same number the public contact page uses).
const ADMIN_WA = '972535035770'

type CampaignType = 'donation' | 'kaparot' | 'products'
const TYPES: { key: CampaignType; label: string; desc: string; Icon: typeof Heart }[] = [
  { key: 'donation', label: 'קמפיין רגיל', desc: 'דף גיוס תרומות קלאסי — יעד, סכומים, קבוצות ומתרימים.', Icon: Heart },
  { key: 'kaparot', label: 'דף כפרות', desc: 'פדיון כפרות אונליין — נפשות, שמות ונוסח הכפרות.', Icon: Feather },
  { key: 'products', label: 'דף מכירות', desc: 'מכירת כרטיסים / מוצרים עם עגלה וקופה.', Icon: ShoppingBag },
]

export default function RequestCampaignDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<CampaignType | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill the manager's own details.
  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
      setForm(f => ({ ...f, full_name: p?.full_name || '', phone: p?.phone || '', email: user.email || '' }))
    })()
  }, [])

  const typeLabel = TYPES.find(t => t.key === type)?.label || ''
  const waText = encodeURIComponent(`שלום, אני מעוניין לפתוח דף גיוס חדש מסוג "${typeLabel}" בכפול.`)
  const waHref = `https://wa.me/${ADMIN_WA}?text=${waText}`

  async function submit() {
    if (!form.full_name.trim()) { setError('נא למלא שם'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          subject: `בקשת דף גיוס חדש — ${typeLabel}`,
          message: form.message.trim() || `בקשה לפתיחת דף גיוס מסוג "${typeLabel}".`,
          source: `campaign-request:${type}`,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'השליחה נכשלה'); setBusy(false); return }
      setDone(true)
    } catch { setError('השליחה נכשלה') }
    setBusy(false)
  }

  const field = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-black text-gray-900 text-lg">פתיחת דף גיוס חדש</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Step 1 — choose type */}
        {!type && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-500">איזה סוג דף תרצו לפתוח?</p>
            {TYPES.map(t => (
              <button key={t.key} onClick={() => setType(t.key)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors text-right">
                <span className="flex-none w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><t.Icon className="w-5 h-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-gray-900">{t.label}</span>
                  <span className="block text-xs text-gray-500">{t.desc}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — approval notice + contact */}
        {type && !done && (
          <div className="p-5 space-y-4">
            <button onClick={() => setType(null)} className="text-xs text-gray-400 hover:text-gray-600">← בחירת סוג אחר</button>

            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-3.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                פתיחת <span className="font-bold">{typeLabel}</span> מחייבת אישור של מנהל המערכת. השאירו פרטים ונחזור אליכם להקמת הדף.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 col-span-2"><label className="text-xs font-semibold text-gray-600">שם מלא *</label>
                <input className={field} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">טלפון</label>
                <input className={field} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" /></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">אימייל</label>
                <input className={field} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} dir="ltr" /></div>
              <div className="space-y-1 col-span-2"><label className="text-xs font-semibold text-gray-600">פרטים נוספים (אופציונלי)</label>
                <textarea className={field} rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="ספרו לנו על הקמפיין…" /></div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

            <div className="flex flex-col gap-2">
              <button onClick={submit} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 disabled:opacity-50">
                {busy ? 'שולח…' : 'שליחת בקשה'}
              </button>
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold rounded-xl py-3">
                <MessageCircle className="w-4 h-4" /> פנייה מהירה בוואטסאפ
              </a>
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check className="w-7 h-7" /></div>
            <h3 className="font-black text-gray-900 text-lg">הבקשה נשלחה!</h3>
            <p className="text-sm text-gray-500">מנהל המערכת קיבל את הפנייה ויחזור אליכם בהקדם להקמת {typeLabel}.</p>
            <button onClick={onClose} className="mt-2 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl">סגירה</button>
          </div>
        )}
      </div>
    </div>
  )
}
