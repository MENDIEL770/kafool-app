'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Search, Phone, MessageCircle, ExternalLink, Check, Clock } from 'lucide-react'

export interface Lead {
  id: string
  token: string
  name: string
  phone: string
  org: string
  score: number | null
  profile: string | null
  range_low: number | null
  range_high: number | null
  goal: number | null
  source: string | null
  sms_sent_at: string | null
  created_at: string
}

const PROFILE_LABEL: Record<string, string> = {
  ready: 'מוכנים לזינוק', vision: 'חזון גדול, בסיס קטן', audience: 'יש קהל, אין מערכת', start: 'מתחילים מהבסיס', track: 'בדרך הנכונה',
}

// A normalized 9-digit phone → a sendable 0-prefixed display / wa.me link.
const display = (p: string) => (p.length === 9 ? '0' + p : p)
const waLink = (p: string) => `https://wa.me/972${p.replace(/\D/g, '').slice(-9)}`
const ils = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('en-US') + ' ₪')

export default function LeadsClient({ initial }: { initial: Lead[] }) {
  const [q, setQ] = useState('')
  const fmt = (iso: string) => new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  const filtered = useMemo(() => initial.filter((l) => {
    if (!q.trim()) return true
    const hay = `${l.name} ${l.org} ${l.phone} ${l.profile || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  }), [initial, q])

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">בדיקות מוכנות</h1>
      </div>
      <p className="text-gray-500 mb-5">לידים מהשאלון בדף <span dir="ltr">/services</span>. כל מילוי נשמר, גם אם לא נשלח SMS.</p>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, מוסד או טלפון…"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">אין עדיין בדיקות מוכנות.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex-none w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex flex-col items-center justify-center leading-none">
                <span className="text-xl font-semibold">{l.score ?? '—'}</span>
                <span className="text-[10px] text-blue-400">/100</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">{l.name} · <span className="text-gray-600">{l.org}</span></div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {l.profile ? PROFILE_LABEL[l.profile] || l.profile : ''} · טווח {ils(l.range_low)}–{ils(l.range_high)}
                  {l.goal != null ? ` · יעד ${ils(l.goal)}` : ''}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{display(l.phone)}</span></span>
                  <span>{fmt(l.created_at)}</span>
                  {l.sms_sent_at
                    ? <span className="inline-flex items-center gap-1 text-green-600"><Check className="w-3 h-3" />SMS נשלח</span>
                    : <span className="inline-flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" />SMS לא נשלח</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"><MessageCircle className="w-4 h-4" />וואטסאפ</a>
                <a href={`/report/${l.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"><ExternalLink className="w-4 h-4" />דוח</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
