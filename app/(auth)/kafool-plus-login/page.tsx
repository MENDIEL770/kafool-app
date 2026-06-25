'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, ArrowLeft } from 'lucide-react'

const PLUS_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

const isInAppBrowser = () =>
  typeof navigator !== 'undefined' &&
  /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|MicroMessenger|; wv\)|GSA\//i.test(navigator.userAgent)

export default function KafoolPlusLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGoogle, setShowGoogle] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isInAppBrowser()) }, [])
  // already logged in → straight in.
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (data.session && typeof window !== 'undefined') window.location.replace('/plus')
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const mail = email.trim().toLowerCase()

    // 1) try a normal sign-in
    let { error: signInErr } = await supabase.auth.signInWithPassword({ email: mail, password })

    // 2) no account yet? lazily provision it with the default password, then retry.
    if (signInErr) {
      const res = await fetch('/api/plus/ensure-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.created) {
        ({ error: signInErr } = await supabase.auth.signInWithPassword({ email: mail, password }))
      } else if (data.exists) {
        setError('סיסמה שגויה'); setLoading(false); return
      } else {
        setError(data.error || 'אימייל או סיסמה שגויים'); setLoading(false); return
      }
    }

    if (signInErr) { setError('אימייל או סיסמה שגויים'); setLoading(false); return }
    window.location.href = '/plus'
  }

  async function signInWithGoogle() {
    setGoogleLoading(true); setError(null)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${PLUS_ORIGIN}/auth/callback`, queryParams: { prompt: 'select_account' } },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  return (
    <div dir="rtl" className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f1830 0%, #16223f 45%, #21376a 100%)' }}>
      <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #c2a14e, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />

      <div className="relative w-full max-w-md">
        {/* brand */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#c2a14e,#e0c878)' }}>
              <Phone className="w-6 h-6 text-[#16223f]" />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">Kafool<span style={{ color: '#d9bd72' }}>+</span></span>
          </div>
          <p className="text-sm" style={{ color: '#aebbd6' }}>מוקד הגיוס הטלפוני — חכם, מהיר ומותאם אישית</p>
        </div>

        {/* card */}
        <div className="rounded-3xl p-7 shadow-2xl border" style={{ background: 'rgba(255,255,255,0.97)', borderColor: 'rgba(255,255,255,0.2)' }}>
          <h1 className="text-2xl font-black text-gray-900 text-center">כניסה למערכת</h1>
          <p className="text-sm text-gray-400 text-center mt-1 mb-5">התחברות עם אימייל וסיסמה</p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4 text-center">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-[13px] font-semibold text-gray-600 mb-1 block">אימייל</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"
                placeholder="you@example.com" autoComplete="username"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-600 mb-1 block">סיסמה</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required dir="ltr"
                placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
              style={{ background: '#21376a' }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>כניסה <ArrowLeft className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-[12px] text-gray-400 mt-4">
            התחברות ראשונה? הזן/י את האימייל שלך עם סיסמת ברירת המחדל — תוכל/י לשנות אותה בהגדרות.
          </p>

          {/* hidden Google fallback (for accounts that signed up with Google) */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            {!showGoogle ? (
              <button onClick={() => setShowGoogle(true)} className="text-[12px] text-gray-400 hover:text-gray-600 underline">
                התחברות עם Google
              </button>
            ) : (
              <>
                {inApp && (
                  <div className="text-[12px] rounded-xl px-3 py-2 mb-3 text-right" style={{ background: '#fef3c7', color: '#92400e' }}>
                    ⚠️ פתחת בדפדפן בתוך אפליקציה — גוגל חוסם כאן התחברות. פתח/י ב-Safari או Chrome.
                  </div>
                )}
                <button onClick={signInWithGoogle} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-60">
                  {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
                    </svg>
                  )}
                  התחבר עם Google
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#7e8bab' }}>Kafool+ · מופעל על ידי Kafool</p>
      </div>
    </div>
  )
}
