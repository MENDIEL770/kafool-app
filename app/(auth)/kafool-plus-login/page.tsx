'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, Users, Target, ArrowRight, Search, ChevronLeft } from 'lucide-react'

const PLUS_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

const isInAppBrowser = () =>
  typeof navigator !== 'undefined' &&
  /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|MicroMessenger|; wv\)|GSA\//i.test(navigator.userAgent)

type Role = 'manager' | 'coordinator' | 'caller'
type Member = { id: string; label: string; sub: string }

const ROLES: { key: Role; title: string; desc: string; icon: typeof Phone; color: string }[] = [
  { key: 'manager',     title: 'מנהל ראשי', desc: 'גישה מלאה לכל הסניפים והנתונים', icon: Target, color: '#c2a14e' },
  { key: 'coordinator', title: 'רכז',       desc: 'ניהול הסניף והטלפנים שלי',        icon: Users,  color: '#6366f1' },
  { key: 'caller',      title: 'טלפן',      desc: 'מסך החיוג והלידים שלי',           icon: Phone,  color: '#3b82f6' },
]

export default function KafoolPlusLoginPage() {
  const [step, setStep] = useState<'roles' | 'pick'>('roles')
  const [role, setRole] = useState<Role | null>(null)
  const [password, setPassword] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGoogle, setShowGoogle] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isInAppBrowser()) }, [])
  // already logged in with a real Google session → straight in.
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (data.session && typeof window !== 'undefined') window.location.replace('/plus')
    })
  }, [])

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!role || !password) return
    setLoading(true); setError(null)
    const res = await fetch('/api/plus/quick-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'שגיאה'); setLoading(false); return }
    if (data.redirect) { window.location.href = data.redirect; return }
    setMembers(data.members || []); setStep('pick'); setLoading(false)
  }

  async function pickMember(memberId: string) {
    setLoading(true); setError(null)
    const res = await fetch('/api/plus/quick-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'שגיאה'); setLoading(false); return }
    window.location.href = data.redirect || '/plus'
  }

  async function signInWithGoogle() {
    setGoogleLoading(true); setError(null)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${PLUS_ORIGIN}/auth/callback`, queryParams: { prompt: 'select_account' } },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const roleMeta = ROLES.find(r => r.key === role)
  const filtered = members.filter(m =>
    !filter || m.label.includes(filter) || m.sub.includes(filter))

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
        <div className="rounded-3xl p-6 shadow-2xl border" style={{ background: 'rgba(255,255,255,0.97)', borderColor: 'rgba(255,255,255,0.2)' }}>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4 text-center">{error}</p>}

          {/* STEP: role + password */}
          {step === 'roles' && (
            <>
              <h1 className="text-xl font-black text-gray-900 text-center mb-1">בחר/י כיצד להיכנס</h1>
              <p className="text-sm text-gray-400 text-center mb-5">בחר/י תפקיד והזן/י את סיסמת הכניסה</p>

              <div className="space-y-2.5">
                {ROLES.map(({ key, title, desc, icon: Icon, color }) => {
                  const active = role === key
                  return (
                    <button key={key} onClick={() => { setRole(key); setError(null) }}
                      className="w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-right transition-all"
                      style={{
                        borderColor: active ? color : '#e5e7eb',
                        background: active ? `${color}12` : '#fff',
                      }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{title}</div>
                        <div className="text-[12px] text-gray-400">{desc}</div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: active ? color : '#d1d5db' }}>
                        {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {role && (
                <form onSubmit={submitPassword} className="mt-4 space-y-3">
                  <input
                    type="password" inputMode="numeric" autoFocus value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="סיסמת כניסה"
                    dir="ltr"
                    className="w-full text-center tracking-widest text-lg bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button type="submit" disabled={loading || !password}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: roleMeta?.color || '#6366f1' }}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>המשך <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </>
          )}

          {/* STEP: pick yourself from the list */}
          {step === 'pick' && (
            <>
              <button onClick={() => { setStep('roles'); setPassword(''); setMembers([]); setFilter('') }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3">
                <ChevronLeft className="w-4 h-4 rotate-180" /> חזרה
              </button>
              <h1 className="text-xl font-black text-gray-900 text-center mb-1">
                {role === 'coordinator' ? 'בחר/י את הסניף שלך' : 'בחר/י את עצמך'}
              </h1>
              <p className="text-sm text-gray-400 text-center mb-4">לחץ/י על השם שלך כדי להיכנס</p>

              <div className="relative mb-3">
                <Search className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="חיפוש..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              <div className="max-h-[44vh] overflow-auto space-y-1.5 -mx-1 px-1">
                {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-6">לא נמצאו תוצאות</p>}
                {filtered.map(m => (
                  <button key={m.id} onClick={() => pickMember(m.id)} disabled={loading}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-100 hover:border-violet-300 hover:bg-violet-50/50 px-3.5 py-3 text-right transition-all disabled:opacity-50">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{m.label}</div>
                      {m.sub && <div className="text-[11px] text-gray-400 truncate" dir="ltr">{m.sub}</div>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
              {loading && <div className="flex justify-center pt-3"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>}
            </>
          )}

          {/* hidden Google fallback (for the team / edge cases) */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            {!showGoogle ? (
              <button onClick={() => setShowGoogle(true)} className="text-[12px] text-gray-400 hover:text-gray-600 underline">
                התחברות עם Google (לצוות)
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
