'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw, Check } from 'lucide-react'

type Row = {
  campaign_id: string; campaign_title: string; donor_name: string; phone: string
  donor_email: string | null; monthly: number; group_slug: string; attempts: number; first: string
  // editable
  months?: string; charge_day?: string; start_date?: string; note?: string; include?: boolean
}

// Super-admin: recover הו"ק commitments that came through Kafool but were never
// recorded (Kesher sent no callback — typically a future-dated first charge).
export default function RecoverHoksAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState('14')
  const [msg, setMsg] = useState('')

  async function scan() {
    setBusy(true); setMsg(''); setRows(null)
    try {
      const res = await fetch('/api/super-admin/recover-hoks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', days: Number(days) || 14 }),
      })
      const j = await res.json()
      setRows((j.items || []).map((r: Row) => ({ ...r, months: '', charge_day: '', start_date: '', note: '', include: false })))
    } catch (e) { setMsg('הסריקה נכשלה: ' + String(e)) }
    setBusy(false)
  }

  function patch(i: number, p: Partial<Row>) {
    setRows(rs => rs!.map((r, idx) => idx === i ? { ...r, ...p } : r))
  }

  async function record() {
    const items = (rows || []).filter(r => r.include && Number(r.months) > 0)
    if (!items.length) { setMsg('בחר שורות והזן מספר חודשים'); return }
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/super-admin/recover-hoks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record', items: items.map(r => ({
          campaign_id: r.campaign_id, group_slug: r.group_slug, phone: r.phone,
          donor_name: r.donor_name, donor_email: r.donor_email, monthly: r.monthly,
          months: Number(r.months), charge_day: r.charge_day ? Number(r.charge_day) : null,
          start_date: r.start_date || null, note: r.note || null,
        })) }),
      })
      const j = await res.json()
      const ok = (j.results || []).filter((x: any) => x.ok).length
      const fail = (j.results || []).filter((x: any) => !x.ok)
      setMsg(`נרשמו ${ok} הו"ק${fail.length ? ` · ${fail.length} נכשלו: ${fail.map((f: any) => `${f.phone} (${f.error})`).join(', ')}` : ''}`)
      await scan() // refresh — recorded rows drop off the list
    } catch (e) { setMsg('הרישום נכשל: ' + String(e)) }
    setBusy(false)
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 space-y-4" dir="rtl">
      <div>
        <h2 className="text-base font-bold text-gray-900">שחזור הו"קים חסרים</h2>
        <p className="text-xs text-gray-400 mt-1">
          הו"קים שנכנסו דרך כפול אך לא נרשמו (קשר לא שלח callback — לרוב חיוב ראשון עתידי).
          אמת מול קשר, הזן מספר חודשים, וסמן לרישום. <b>שים לב:</b> ה-intent לא מאשר שהעסקה הושלמה — במיוחד שורות עם כמה ניסיונות.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">טווח ימים:</label>
        <input value={days} onChange={e => setDays(e.target.value)} inputMode="numeric"
          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-blue-400" />
        <button type="button" onClick={scan} disabled={busy}
          className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> סרוק
        </button>
      </div>

      {rows && rows.length === 0 && <p className="text-sm text-emerald-600">אין הו"קים חסרים בטווח שנבחר 🎉</p>}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-[11px] text-gray-400 border-b">
                <th className="py-2 pl-2">רישום</th><th className="pl-2">תורם</th><th className="pl-2">קמפיין</th>
                <th className="pl-2">חודשי</th><th className="pl-2">חודשים</th><th className="pl-2">יום חיוב</th>
                <th className="pl-2">קבוצה</th><th className="pl-2">ניסיונות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-b border-gray-50 ${r.attempts > 1 ? 'bg-amber-50/40' : ''}`}>
                  <td className="py-2 pl-2">
                    <input type="checkbox" checked={!!r.include} onChange={e => patch(i, { include: e.target.checked })}
                      className="w-4 h-4 accent-blue-600" />
                  </td>
                  <td className="pl-2">
                    <div className="font-semibold text-gray-800">{r.donor_name || '—'}</div>
                    <div className="text-[11px] text-gray-400" dir="ltr">{r.phone}</div>
                  </td>
                  <td className="pl-2 text-gray-600 max-w-[9rem] truncate">{r.campaign_title}</td>
                  <td className="pl-2 font-bold text-gray-800">₪{r.monthly.toLocaleString()}</td>
                  <td className="pl-2">
                    <input value={r.months} onChange={e => patch(i, { months: e.target.value })} inputMode="numeric" placeholder="24"
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center outline-none focus:ring-2 focus:ring-blue-400" />
                  </td>
                  <td className="pl-2">
                    <input value={r.charge_day} onChange={e => patch(i, { charge_day: e.target.value })} inputMode="numeric" placeholder="2"
                      className="w-12 border border-gray-200 rounded-lg px-2 py-1 text-center outline-none focus:ring-2 focus:ring-blue-400" />
                  </td>
                  <td className="pl-2 text-[11px] text-gray-400">{r.group_slug || '—'}</td>
                  <td className="pl-2">
                    {r.attempts > 1
                      ? <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><AlertTriangle className="w-3.5 h-3.5" />{r.attempts}</span>
                      : <span className="text-gray-400">{r.attempts}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length > 0 && (
        <button type="button" onClick={record} disabled={busy}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Check className="w-4 h-4" /> רשום נבחרים
        </button>
      )}

      {msg && <p className="text-sm font-medium text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{msg}</p>}
    </div>
  )
}
