'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Loader2 } from 'lucide-react'

export default function KafoolPlusLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/plus`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    // on success the browser redirects to Google
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
            <p className="text-sm text-gray-400 mt-1">לרכזים ולטלפנים — התחברות עם חשבון Google</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
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

        <p className="text-center text-xs text-gray-400">
          התחבר עם חשבון ה-Google של המייל שאיתו נרשמת. חשבון שאינו רשום במערכת — לא יקבל גישה.
        </p>
        <p className="text-center text-[11px] text-gray-300">Kafool+ · מוקד גיוס טלפוני</p>
      </div>
    </div>
  )
}
