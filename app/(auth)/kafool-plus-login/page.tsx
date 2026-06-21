'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Loader2, MailCheck } from 'lucide-react'

export default function KafoolPlusLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (!mail) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: mail,
      options: {
        emailRedirectTo: `${window.location.origin}/kafool-plus`,
        shouldCreateUser: true,
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">כניסה למוקד Kafool+</h1>
            <p className="text-sm text-gray-400 mt-1">לרכזים ולטלפנים — התחברות עם המייל שלכם</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <MailCheck className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-bold text-gray-800">שלחנו לך קישור כניסה למייל</p>
            <p className="text-sm text-gray-500">פתח את המייל <span className="font-bold" dir="ltr">{email}</span> ולחץ על הקישור כדי להיכנס. (בדוק גם בספאם.)</p>
            <button onClick={() => { setSent(false); setEmail('') }} className="text-sm text-indigo-600 hover:underline">שליחה למייל אחר</button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">כתובת המייל שלך</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-[11px] text-gray-400">השתמש במייל שהמנהל/הרכז רשם אותך איתו.</p>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שלח לי קישור כניסה'}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-gray-300">Kafool+ · מוקד גיוס טלפוני</p>
      </div>
    </div>
  )
}
