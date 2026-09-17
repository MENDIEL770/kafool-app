'use client'

import { useMemo, useState } from 'react'
import { Inbox, Search, Phone, Mail, MessageCircle, Check, Circle } from 'lucide-react'

export interface Submission {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  subject: string | null
  message: string
  source: string | null
  is_read: boolean
  created_at: string
}

const waLink = (phone?: string | null) => {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return null
  return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}`
}

// A campaign-open request carries source "campaign-request:<type>".
const isRequest = (s: Submission) => (s.source || '').startsWith('campaign-request')

export default function SubmissionsClient({ initial }: { initial: Submission[] }) {
  const [items, setItems] = useState<Submission[]>(initial)
  const [tab, setTab] = useState<'all' | 'unread' | 'requests'>('all')
  const [q, setQ] = useState('')

  const unread = items.filter(s => !s.is_read).length
  const requests = items.filter(isRequest).length

  async function markRead(id: string, is_read: boolean) {
    setItems(arr => arr.map(s => s.id === id ? { ...s, is_read } : s))
    await fetch('/api/super-admin/cms/submissions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_read }),
    }).catch(() => {})
  }

  const filtered = useMemo(() => items.filter(s => {
    if (tab === 'unread' && s.is_read) return false
    if (tab === 'requests' && !isRequest(s)) return false
    if (q.trim()) {
      const hay = `${s.full_name} ${s.phone || ''} ${s.email || ''} ${s.subject || ''} ${s.message} ${s.source || ''}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  }), [items, tab, q])

  const fmt = (iso: string) => new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Inbox className="w-5 h-5" /></span>
          פניות ובקשות
        </h1>
        <p className="text-sm text-gray-400 mt-1">כל הפניות מטופס יצירת הקשר ובקשות פתיחת דף גיוס ממנהלי קמפיינים.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {([['all', `הכל · ${items.length}`], ['unread', `לא נקראו · ${unread}`], ['requests', `בקשות דף גיוס · ${requests}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש בשם / טלפון / נושא / תוכן…"
            className="w-full rounded-xl border border-gray-200 pr-9 pl-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">אין פניות להצגה</div>
        ) : filtered.map(s => {
          const wa = waLink(s.phone)
          return (
            <div key={s.id} className={`rounded-2xl border p-4 ${s.is_read ? 'bg-white border-gray-100' : 'bg-blue-50/40 border-blue-100'}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => markRead(s.id, !s.is_read)} title={s.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
                  className="shrink-0 mt-0.5 text-blue-600">{s.is_read ? <Check className="w-4 h-4 text-gray-300" /> : <Circle className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{s.full_name}</span>
                    {isRequest(s) && <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">בקשת דף גיוס</span>}
                    {s.subject && !isRequest(s) && <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{s.subject}</span>}
                  </div>
                  {isRequest(s) && s.subject && <div className="text-xs font-semibold text-amber-700 mt-0.5">{s.subject}</div>}
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{s.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    {s.phone && <span dir="ltr" className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    {s.email && <a href={`mailto:${s.email}`} dir="ltr" className="inline-flex items-center gap-1 hover:text-blue-600"><Mail className="w-3 h-3" />{s.email}</a>}
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"><MessageCircle className="w-3 h-3" />וואטסאפ</a>}
                    <span className="mr-auto tabular-nums">{fmt(s.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
