'use client'

import { useState } from 'react'
import { Loader2, MailCheck, ShieldQuestion } from 'lucide-react'

export default function RequestAccess({ email }: { email: string | null }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setLoading(true); setError(null)
    const res = await fetch('/api/kafoolplus/access-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'השליחה נכשלה'); return }
    setSent(true)
  }

  return (
    <div dir="rtl" className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-amber-50 text-amber-500">
          <ShieldQuestion className="w-7 h-7" />
        </div>
        {sent ? (
          <>
            <MailCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-black text-gray-900">הפנייה נשלחה</h1>
            <p className="text-sm text-gray-500">המנהל יקבל את הבקשה וישייך אותך לקמפיין. תקבל גישה לאחר האישור — נסה להתחבר שוב מאוחר יותר.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-gray-900">החשבון שלך אינו רשום במערכת</h1>
            <p className="text-sm text-gray-500">
              {email ? <>התחברת עם <span className="font-bold" dir="ltr">{email}</span>, </> : null}
              אך הוא לא משויך לאף קמפיין. שלח פנייה ומנהל המערכת ישייך אותך.
            </p>
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="הוסף פרטים (שם מלא, איזה ארגון/קמפיין, תפקיד)..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 text-right"
            />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={send} disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שלח פנייה לגישה'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
