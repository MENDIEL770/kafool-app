'use client'

import { useState } from 'react'

interface Initial {
  firstName: string; lastName: string; email: string; phone: string
  address: string; companyId: string; orgName: string
}

const HOW_HEARD = ['חבר/המלצה', 'גוגל / חיפוש', 'רשתות חברתיות', 'פנייה טלפונית', 'אחר']

export default function IntakeForm({ token, initial }: { token: string; initial: Initial }) {
  const [form, setForm] = useState({
    firstName: initial.firstName, lastName: initial.lastName, email: initial.email,
    phone: initial.phone, address: initial.address, companyId: initial.companyId,
    orgName: initial.orgName, howHeard: '', password: '', passwordConfirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.passwordConfirm) { setError('הסיסמאות אינן תואמות'); return }
    if (form.password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true)
    const res = await fetch('/api/onboarding/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'אירעה שגיאה'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-4xl">✓</div>
        <p className="font-bold text-gray-800 text-lg">הפרטים נקלטו בהצלחה!</p>
        <p className="text-sm text-gray-500">החשבון נוצר. לאחר השלמת התשלום הוא יופעל ותקבל גישה למערכת.</p>
      </div>
    )
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition'
  const lbl = 'text-xs font-semibold text-gray-500 mb-1.5 block'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>שם *</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={field} /></div>
        <div><label className={lbl}>שם משפחה</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={field} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>טלפון</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={field} dir="ltr" placeholder="050-0000000" /></div>
        <div><label className={lbl}>אימייל * (שם המשתמש)</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={field} dir="ltr" /></div>
      </div>
      <div><label className={lbl}>כתובת</label><input value={form.address} onChange={e => set('address', e.target.value)} className={field} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>שם העמותה/ארגון *</label><input value={form.orgName} onChange={e => set('orgName', e.target.value)} className={field} /></div>
        <div><label className={lbl}>ח.פ. / מס׳ עמותה</label><input value={form.companyId} onChange={e => set('companyId', e.target.value)} className={field} dir="ltr" /></div>
      </div>
      <div>
        <label className={lbl}>איך הגעת אלינו?</label>
        <select value={form.howHeard} onChange={e => set('howHeard', e.target.value)} className={field + ' bg-white'}>
          <option value="">בחר...</option>
          {HOW_HEARD.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>סיסמה *</label><input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={field} dir="ltr" autoComplete="new-password" /></div>
        <div><label className={lbl}>אימות סיסמה *</label><input type="password" value={form.passwordConfirm} onChange={e => set('passwordConfirm', e.target.value)} className={field} dir="ltr" autoComplete="new-password" /></div>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

      <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
        {loading ? 'שולח...' : 'שליחת הפרטים'}
      </button>
    </form>
  )
}
