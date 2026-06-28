'use client'

import { useMemo, useState } from 'react'
import { Search, Users, Phone, Mail, Heart } from 'lucide-react'

export interface PoolDonor {
  name: string
  phone: string
  email: string
  total: number
  count: number
  campaigns: { title: string; amount: number }[]
}

export default function DonorPoolClient({ donors }: { donors: PoolDonor[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return donors
    return donors.filter(d =>
      d.name.toLowerCase().includes(s) || d.phone.includes(s) || d.email.toLowerCase().includes(s) ||
      d.campaigns.some(c => c.title.toLowerCase().includes(s)))
  }, [donors, q])

  const totalRaised = useMemo(() => donors.reduce((s, d) => s + d.total, 0), [donors])
  const repeat = useMemo(() => donors.filter(d => d.campaigns.length > 1).length, [donors])

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" /> מאגר תורמים</h1>
        <p className="text-sm text-gray-400 mt-0.5">כל מי שתרם אי-פעם, מכל הקמפיינים — כדי שתדע למי לפנות בקמפיין הבא.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'תורמים ייחודיים', value: donors.length.toLocaleString('he-IL'), icon: Users, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'תרמו ביותר מקמפיין אחד', value: repeat.toLocaleString('he-IL'), icon: Heart, color: 'text-rose-700', bg: 'bg-rose-50' },
          { label: 'סה״כ נתרם', value: `₪${totalRaised.toLocaleString('he-IL')}`, icon: Heart, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-gray-100 p-4 ${s.bg}`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs font-semibold text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי שם, טלפון, מייל או קמפיין…"
          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto text-gray-200 mb-2" />
          <p className="text-sm">{donors.length === 0 ? 'עדיין אין תורמים במאגר.' : 'לא נמצאו תוצאות.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((d, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shrink-0">
                {(d.name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-800">{d.name || <span className="text-gray-300">ללא שם</span>}</span>
                  {d.campaigns.length > 1 && (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">תורם חוזר · {d.campaigns.length} קמפיינים</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {d.phone && <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 hover:text-blue-600" dir="ltr"><Phone className="w-3 h-3" />{d.phone}</a>}
                  {d.email && <span className="inline-flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{d.email}</span>}
                </div>
                {/* per-campaign breakdown */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.campaigns.map((c, j) => (
                    <span key={j} className="text-[11px] bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-gray-600">
                      {c.title} <b className="text-gray-800">₪{c.amount.toLocaleString('he-IL')}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-lg font-black text-emerald-700">₪{d.total.toLocaleString('he-IL')}</div>
                <div className="text-[11px] text-gray-400">{d.count} תרומות</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
