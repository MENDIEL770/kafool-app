'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, Users, Target } from 'lucide-react'

// The Kafool+ module lives on its own subdomain — always return there after OAuth.
const PLUS_ORIGIN =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://plus.kafool.com'
    : (typeof window !== 'undefined' ? window.location.origin : '')

// In-app browsers (WhatsApp, Instagram, Facebook, Android webview…) block Google
// sign-in — the user must open the page in real Safari/Chrome.
const isInAppBrowser = () =>
  typeof navigator !== 'undefined' &&
  /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|MicroMessenger|; wv\)|GSA\//i.test(navigator.userAgent)

export default function KafoolPlusLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isInAppBrowser()) }, [])

  async function signInWithGoogle() {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${PLUS_ORIGIN}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div dir="rtl" className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f1830 0%, #16223f 45%, #21376a 100%)' }}>
      {/* decorative glows */}
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
          <p className="text-sm text-gray-400 text-center mt-1 mb-5">לרכזים ולטלפנים — התחברות מאובטחת עם Google</p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

          {inApp && (
            <div className="text-sm rounded-xl px-3 py-2.5 mb-4" style={{ background: '#fef3c7', color: '#92400e' }}>
              ⚠️ פתחת בדפדפן בתוך אפליקציה — גוגל חוסם כאן התחברות. פתח/י את <b dir="ltr">plus.kafool.com</b> ב-<b>Safari</b> (או Chrome) ונסה/י שוב.
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
            )}
            התחבר עם Google
          </button>

          {/* feature chips */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[{ icon: Phone, l: 'חיוג חכם' }, { icon: Users, l: 'ניהול לידים' }, { icon: Target, l: 'יעדים בזמן אמת' }].map(({ icon: Icon, l }) => (
              <div key={l} className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 bg-gray-50 border border-gray-100">
                <Icon className="w-4 h-4 text-[#21376a]" />
                <span className="text-[11px] text-gray-500 font-medium text-center leading-tight">{l}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            התחבר עם חשבון ה-Google של המייל שאיתו נרשמת. חשבון שאינו רשום — יוכל לבקש הצטרפות.
          </p>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#7e8bab' }}>Kafool+ · מופעל על ידי Kafool</p>
      </div>
    </div>
  )
}
