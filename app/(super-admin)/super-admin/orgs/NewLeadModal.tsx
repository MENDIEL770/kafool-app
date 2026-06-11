'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Building2, User, Mail, Phone, Banknote, FileText, Plus, Pencil } from 'lucide-react'
import type { Lead } from './LeadsTabClient'

export default function NewLeadModal({ onClose, lead }: { onClose: () => void; lead?: Lead }) {
  const router = useRouter()
  const isEdit = !!lead
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    orgName: lead?.org_name ?? '',
    contactName: lead?.contact_name ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    setupFee: lead?.setup_fee ? String(lead.setup_fee) : '',
    notes: lead?.notes ?? '',
  })

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName.trim()) { setError('שם ארגון הוא חובה'); return }
    setLoading(true)
    setError('')

    if (isEdit) {
      const supabase = createClient()
      const { error: upErr } = await supabase
        .from('sales_leads')
        .update({
          org_name: form.orgName.trim(),
          contact_name: form.contactName.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          setup_fee: Number(form.setupFee) || 0,
          notes: form.notes.trim() || null,
        })
        .eq('id', lead!.id)
      setLoading(false)
      if (upErr) { setError(upErr.message); return }
    } else {
      const res = await fetch('/api/super-admin/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error || 'שגיאה'); return }
    }

    router.refresh()
    onClose()
  }

  const field = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              {isEdit ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg">{isEdit ? 'עריכת ליד' : 'ליד חדש'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? 'עדכון פרטי הלקוח הפוטנציאלי' : 'לקוח פוטנציאלי בפייפליין'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> שם הארגון *
            </label>
            <input value={form.orgName} onChange={e => set('orgName', e.target.value)} placeholder="ישיבת... / עמותת..." className={field} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> איש קשר
            </label>
            <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="ישראל ישראלי" className={field} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> טלפון
              </label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="050-0000000" className={field} dir="ltr" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> אימייל
              </label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="org@example.com" className={field} dir="ltr" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> דמי הקמה (₪)
            </label>
            <input type="number" min="0" value={form.setupFee} onChange={e => set('setupFee', e.target.value)} placeholder="490" className={field} dir="ltr" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> הערות
            </label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="פרטים מהשיחה..." className={field} />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              ביטול
            </button>
            <button type="submit" disabled={loading || !form.orgName.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'שומר...' : isEdit ? 'שמור שינויים' : 'צור ליד'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
