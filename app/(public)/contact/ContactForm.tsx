'use client'

import { useState } from 'react'

const SOURCE_OPTIONS = [
  'בחר...',
  'חבר / היכרות אישית',
  'רשתות חברתיות',
  'גוגל / חיפוש',
  'פרסום ממומן',
  'פודקאסט / כנס',
  'ראיתי קמפיין של כפול',
  'אחר',
]

const SUBJECT_OPTIONS = ['הקמת דף גיוס', 'עיצוב', 'אחר']

export default function ContactForm() {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    message: '',
    source: '',
  })
  const [subjects, setSubjects] = useState<string[]>([])
  const [subjectOther, setSubjectOther] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  function toggleSubject(opt: string) {
    setSubjects(prev => (prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.message.trim()) {
      setError('שם מלא והודעה הם שדות חובה')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const subject = [
        ...subjects.filter(s => s !== 'אחר'),
        ...(subjects.includes('אחר') && subjectOther.trim() ? [subjectOther.trim()] : []),
      ].join(', ')
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject, source: form.source || null }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'שגיאה בשליחת הפנייה'); return }
      setSuccess(true)
    } catch {
      setError('שגיאה בשליחת הפנייה, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-black text-green-800 mb-2">תודה!</h3>
        <p className="text-green-700 text-lg">קיבלנו את פנייתכם — נחזור אליכם בקרוב</p>
      </div>
    )
  }

  const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">

      {/* Name */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          שם מלא <span className="text-red-500">*</span>
        </label>
        <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
          placeholder="ישראל ישראלי" className={inputCls} required />
      </div>

      {/* Phone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">טלפון</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="050-0000000" className={inputCls} dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">אימייל</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="example@email.com" className={inputCls} dir="ltr" />
        </div>
      </div>

      {/* Subject (multi-select) */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          נושא <span className="text-gray-400 font-normal text-xs">(אפשר לבחור כמה)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_OPTIONS.map(opt => {
            const active = subjects.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleSubject(opt)}
                aria-pressed={active}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {subjects.includes('אחר') && (
          <input
            type="text"
            value={subjectOther}
            onChange={e => setSubjectOther(e.target.value)}
            placeholder="פרטו את הנושא..."
            className={`${inputCls} mt-3`}
          />
        )}
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">איך הגעת אלינו?</label>
        <select value={form.source} onChange={e => set('source', e.target.value)}
          className={`${inputCls} cursor-pointer`}>
          {SOURCE_OPTIONS.map(opt => (
            <option key={opt} value={opt === 'בחר...' ? '' : opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          הודעה <span className="text-red-500">*</span>
        </label>
        <textarea value={form.message} onChange={e => set('message', e.target.value)}
          placeholder="כתבו את הפנייה שלכם כאן..." rows={4}
          className={`${inputCls} resize-none`} required />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white font-black py-3.5 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50">
        {loading ? 'שולח...' : 'שלח פנייה'}
      </button>
    </form>
  )
}
