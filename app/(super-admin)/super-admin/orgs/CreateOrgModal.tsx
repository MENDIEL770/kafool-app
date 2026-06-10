'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Building2, User, Mail, Phone, Link2, Send, Plus } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function CreateOrgModal({ onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')

  const [form, setForm] = useState({
    orgName: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    sendInvite: true,
  })

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30)
  }

  function set(key: keyof typeof form, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
    if (key === 'orgName' && typeof val === 'string' && !form.slug) {
      setForm(f => ({ ...f, orgName: val, slug: autoSlug(val) }))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName || !form.slug) { setError('שם ארגון ו-slug הם חובה'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/super-admin/orgs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'שגיאה'); return }

    setCreatedSlug(data.slug)
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

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> כתובת (slug) *
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition">
                  <span className="px-3 py-2.5 bg-gray-50 text-xs text-gray-400 border-l border-gray-200 shrink-0">kafool.com/</span>
                  <input
                    value={form.slug}
                    onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="org-slug"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                    dir="ltr"
                  />
                </div>
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

                  {/* Send invite toggle */}
                  {form.ownerEmail && (
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 cursor-pointer">
                      <div
                        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.sendInvite ? 'bg-blue-500' : 'bg-gray-200'}`}
                        onClick={() => set('sendInvite', !form.sendInvite)}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.sendInvite ? 'right-1' : 'right-5'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Send className="w-3 h-3" /> שלח הזמנה בדוא"ל
                        </p>
                        <p className="text-[11px] text-blue-500">הלקוח יקבל קישור כניסה לדשבורד</p>
                      </div>
                    </label>
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
                  disabled={loading || !form.orgName || !form.slug}
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
                {form.ownerEmail && form.sendInvite
                  ? `הזמנה נשלחה ל-${form.ownerEmail}`
                  : 'הארגון מוכן לשימוש'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-mono text-gray-600" dir="ltr">
              kafool.com/{createdSlug}
            </div>
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
