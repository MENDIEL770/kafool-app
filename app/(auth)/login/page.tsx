'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, ArrowLeft } from 'lucide-react'
import LoginShowcase from './LoginShowcase'
import KafoolLogoIntro from '@/components/KafoolLogoIntro'
import AuthAmbience from '@/components/AuthAmbience'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden" dir="rtl">
      <AuthAmbience />

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative z-10">
        <div className="flex justify-center pt-2">
          <KafoolLogoIntro variant="light" className="w-64 xl:w-72" />
        </div>
        <div className="space-y-8 py-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-black text-white leading-tight">
              כל הגיוס שלכם — חי, במקום אחד
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed">
              תרומות, הוראות קבע, טלפנים, עיצוב ודוחות — בזמן אמת
            </p>
          </div>
          <LoginShowcase />
        </div>
        <p className="text-blue-300 text-xs">© 2025 Kafool. כל הזכויות שמורות.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex lg:hidden items-center gap-2 justify-center mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Kafool</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">כניסה למערכת</h2>
            <p className="text-slate-400 text-sm mt-1">הזן את פרטי הכניסה שלך</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                dir="ltr"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  מתחבר...
                </>
              ) : (
                <>
                  כניסה
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            אין לך חשבון?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              לשליחת פנייה לפתיחת חשבון
            </Link>
          </p>

          {/* Jump to the Kafool+ ambassadors system (separate app) */}
          <div className="pt-2 border-t border-slate-700/50">
            <a
              href="https://plus.kafool.com/"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-violet-200 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 transition-colors"
            >
              📞 מערכת השגרירים — Kafool+
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
