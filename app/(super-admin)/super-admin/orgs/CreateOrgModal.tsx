'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Building2, User, Mail, Phone, Send, Plus, Lock } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function CreateOrgModal({ onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    orgName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    accountMode: 'password' as 'password' | 'invite',
    ownerPassword: '',
    ownerPasswordConfirm: '',
  })

  function set(key: keyof typeof form, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName) { setError('שם הארגון הוא חובה'); return }
    if (form.ownerEmail && form.accountMode === 'password') {
      if (form.ownerPassword.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
      if (form.ownerPassword !== form.ownerPasswordConfirm) { setError('הסיסמאות אינן תואמות'); return }
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/super-admin/orgs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: form.orgName,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone,
        ownerPassword: form.accountMode === 'password' ? form.ownerPassword : undefined,
        sendInvite: form.accountMode === 'invite',
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'שגיאה'); return }

    setStep('success')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-lg">ארגון חדש</h2>
                  <p className="text-xs text-gray-400">יצירת חשבון לקוח חדש</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {/* Org name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> שם הארגון *
                </label>
                <input
                  value={form.orgName}
                  onChange={e => set('orgName', e.target.value)}
                  placeholder="ישיבת... / עמותת... / מוסד..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 mb-3">פרטי בעל החשבון (אופציונלי)</p>

                {/* Owner name */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> שם מלא
                    </label>
                    <input
                      value={form.ownerName}
                      onChange={e => set('ownerName', e.target.value)}
                      placeholder="ישראל ישראלי"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> אימייל
                      </label>
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={e => set('ownerEmail', e.target.value)}
                        placeholder="org@example.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> טלפון
                      </label>
                      <input
                        type="tel"
                        value={form.ownerPhone}
                        onChange={e => set('ownerPhone', e.target.value)}
                        placeholder="050-0000000"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Account creation method */}
                  {form.ownerEmail && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => set('accountMode', 'password')}
                          className={`text-xs font-bold rounded-xl border px-3 py-2 transition-colors ${form.accountMode === 'password' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          צור חשבון עם סיסמה
                        </button>
                        <button
                          type="button"
                          onClick={() => set('accountMode', 'invite')}
                          className={`text-xs font-bold rounded-xl border px-3 py-2 transition-colors ${form.accountMode === 'invite' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          שלח הזמנה במייל
                        </button>
                      </div>

                      {form.accountMode === 'password' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" /> סיסמה *
                            </label>
                            <input
                              type="password" value={form.ownerPassword} onChange={e => set('ownerPassword', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                              dir="ltr" autoComplete="new-password"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">אימות סיסמה *</label>
                            <input
                              type="password" value={form.ownerPasswordConfirm} onChange={e => set('ownerPasswordConfirm', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                              dir="ltr" autoComplete="new-password"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-blue-500 flex items-center gap-1.5 px-1">
                          <Send className="w-3 h-3" /> הלקוח יקבל קישור כניסה במייל להגדרת סיסמה.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.orgName}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'יוצר...' : 'צור ארגון'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl">✓</div>
            <div>
              <h3 className="font-black text-gray-900 text-xl">הארגון נוצר!</h3>
              <p className="text-sm text-gray-500 mt-1">
                {form.ownerEmail
                  ? (form.accountMode === 'invite'
                      ? `הזמנה נשלחה ל-${form.ownerEmail}`
                      : `החשבון נוצר — ${form.ownerEmail} יכול להתחבר עם הסיסמה שהוגדרה`)
                  : 'הארגון מוכן לשימוש'}
              </p>
            </div>
            <p className="text-xs text-gray-400">כתובת דף הגיוס (slug) תיקבע בעת יצירת הקמפיין הראשון.</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
            >
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
