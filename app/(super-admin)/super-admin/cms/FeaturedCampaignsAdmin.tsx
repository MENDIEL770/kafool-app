'use client'

import { useState } from 'react'

export type FeatureRow = { id: string; title: string; slug: string; cover_image_url: string | null; show_on_homepage: boolean }

// Super-admin picker: which campaigns show in the home-page showcase gallery.
export default function FeaturedCampaignsAdmin({ campaigns }: { campaigns: FeatureRow[] }) {
  const [rows, setRows] = useState<FeatureRow[]>(campaigns)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')

  async function toggle(id: string, show: boolean) {
    setBusy(id)
    setRows(rs => rs.map(r => (r.id === id ? { ...r, show_on_homepage: show } : r)))
    try {
      const res = await fetch('/api/super-admin/feature-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, show }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setRows(rs => rs.map(r => (r.id === id ? { ...r, show_on_homepage: !show } : r)))
      alert('העדכון נכשל — ודא שהעמודה show_on_homepage קיימת בטבלת campaigns.')
    }
    setBusy(null)
  }

  const shownCount = rows.filter(r => r.show_on_homepage).length
  const filtered = q.trim() ? rows.filter(r => r.title.includes(q.trim()) || r.slug.includes(q.trim())) : rows

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4" dir="rtl">
      <div>
        <h2 className="text-base font-bold text-gray-900">קמפיינים בעמוד הראשי</h2>
        <p className="text-xs text-gray-400 mt-1">בחר אילו קמפיינים יוצגו בגלריית הקמפיינים בעמוד הבית (הבאנר הראשי של כל קמפיין). {shownCount} מוצגים.</p>
      </div>

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="חיפוש קמפיין…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />

      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
        {filtered.map(r => (
          <div key={r.id} className="flex items-center gap-3 py-2.5">
            <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {r.cover_image_url && <img src={r.cover_image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-800">{r.title || 'ללא שם'}</div>
              <div className="truncate text-[11px] text-gray-400" dir="ltr">/{r.slug}</div>
            </div>
            <button
              type="button"
              onClick={() => toggle(r.id, !r.show_on_homepage)}
              disabled={busy === r.id}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                r.show_on_homepage ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {r.show_on_homepage ? 'מוצג בדף הבית' : 'מוסתר'}
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-gray-400">אין קמפיינים תואמים</p>}
      </div>
    </div>
  )
}
