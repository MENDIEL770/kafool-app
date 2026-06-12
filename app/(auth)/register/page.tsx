'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Phone, Mail, Lock, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import KafoolLogoIntro from '@/components/KafoolLogoIntro'
import AuthAmbience from '@/components/AuthAmbience'

const BENEFITS = [
  'דף גיוס מעוצב באוויר תוך 5 דקות',
  'תרומה מאובטחת בתוך הדף — בלי הפניות החוצה',
  'תשלום הוגן בסכום קבוע, בלי אחוזים מהתרומות',
  'ליווי אישי, עיצוב גרפי ודוחות בזמן אמת',
]

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    agreeTerms: false,
  })

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!form.agreeTerms) { setError('יש לאשר את תנאי השימוש'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: `${form.firstName} ${form.lastName}`,
          phone: form.phone,
          role: 'admin',
        },
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered' ? 'אימייל זה כבר רשום' : authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputCls =
    'w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        <AuthAmbience />
        <div className="w-full max-w-md text-center space-y-6 relative z-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">הבקשה נשלחה!</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              קיבלנו את פרטיך. נעבור על הבקשה ונחזור אליך בהקדם עם אישור גישה למערכת.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all"
          >
            חזרה לכניסה
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden" dir="rtl">
      <AuthAmbience />

      {/* Right panel — branding (first in RTL) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative z-10">
        <div className="flex justify-center pt-2">
          <KafoolLogoIntro variant="light" className="w-64 xl:w-72" />
        </div>

        <div className="space-y-7 max-w-sm mx-auto w-full">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white leading-tight">
              מצטרפים היום —<br />מגייסים כבר השבוע
            </h1>
            <p className="text-blue-200 text-sm">כל מה שצריך כדי להרים קמפיין מצליח</p>
          </div>

          <ul className="space-y-3.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-blue-50 text-sm font-medium">
                <span className="w-5 h-5 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-center gap-2 text-blue-200/90 text-xs bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
            <Sparkles className="w-4 h-4 shrink-0" />
            ההרשמה ללא עלות — משלמים רק כשמקימים קמפיין
          </div>
        </div>

        <p className="text-blue-300 text-xs text-center">© 2025 Kafool. כל הזכויות שמורות.</p>
      </div>

      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-7">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <KafoolLogoIntro variant="light" className="w-48" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">פתיחת חשבון</h2>
            <p className="text-slate-400 text-sm mt-1">מלא את הפרטים ונחזור אליך עם אישור גישה</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium text-slate-300">שם</label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                    placeholder="ישראל" required className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium text-slate-300">שם משפחה</label>
                <input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                  placeholder="ישראלי" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-slate-300">טלפון</label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="050-0000000" required className={`${inputCls} text-left`} dir="ltr" style={{ paddingRight: '2.5rem' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="you@example.com" required className={`${inputCls} text-left`} dir="ltr" style={{ paddingRight: '2.5rem' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                  placeholder="לפחות 8 תווים" required minLength={8} className={`${inputCls} text-left`} dir="ltr" style={{ paddingRight: '2.5rem' }} />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => set('agreeTerms', e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600"
                required
              />
              <span className="text-sm text-slate-400">
                אני מסכים ל<a href="#" className="text-blue-400 hover:text-blue-300 hover:underline">תנאי השימוש</a> של Kafool
              </span>
            </label>

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
                  שולח...
                </>
              ) : (
                <>
                  שלח בקשת הרשמה
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">כניסה</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
