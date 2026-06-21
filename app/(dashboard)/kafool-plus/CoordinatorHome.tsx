'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Trash2, Loader2, CheckCircle2, Clock, Upload, Building2, Shuffle, Phone, Send } from 'lucide-react'

interface Branch { id: string; name: string; master_campaign_id: string }
interface CallerGroup { id: string; display_name: string | null; caller_email: string | null; public_slug: string; donation_link: string | null; personal_goal: number }
interface Lead { id: string; full_name: string | null; phone: string | null; status: string; assigned_caller_group_id: string | null }
interface Member { id: string; email: string; role: string; caller_group_id: string | null; user_id: string | null }

const STATUS_HE: Record<string, string> = {
  new: 'חדש', no_answer: 'לא ענה', busy: 'תפוס', wrong_number: 'מספר שגוי',
  not_interested: 'לא מעוניין', removed: 'הוסר', callback: 'חזור אליו', promised: 'הבטיח', donated: 'תרם',
}

export default function CoordinatorHome({ branch, callerGroups, leads, members }: {
  branch: Branch | null; callerGroups: CallerGroup[]; leads: Lead[]; members: Member[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const [cName, setCName] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cLink, setCLink] = useState('')
  const [cGoal, setCGoal] = useState('')

  if (!branch) return <div dir="rtl" className="p-16 text-center text-gray-500">הסניף לא נמצא.</div>

  async function api(url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true); setError(null)
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'הפעולה נכשלה'); return false }
    return true
  }

  async function addCaller() {
    if (!cName.trim() || !cEmail.trim()) return
    if (await api('/api/kafoolplus/callers', 'POST', { branch_id: branch!.id, display_name: cName, email: cEmail, donation_link: cLink, personal_goal: cGoal })) {
      setCName(''); setCEmail(''); setCLink(''); setCGoal(''); router.refresh()
    }
  }
  async function removeCaller(id: string) {
    if (!confirm('להסיר את הטלפן? (הלידים שלו יחזרו ללא שיוך)')) return
    if (await api('/api/kafoolplus/callers', 'DELETE', { group_id: id })) router.refresh()
  }
  async function assignLead(leadId: string, groupId: string) {
    if (await api('/api/kafoolplus/leads', 'PATCH', { lead_id: leadId, caller_group_id: groupId || null })) router.refresh()
  }
  async function autoSplit() {
    if (callerGroups.length === 0) { setError('אין טלפנים לחלק אליהם'); return }
    if (await api('/api/kafoolplus/leads', 'PATCH', { auto: true, branch_id: branch!.id })) router.refresh()
  }
  async function sendInvite(email: string | null, name: string | null) {
    if (!email) return
    setBusy(true); setError(null)
    const res = await fetch('/api/kafoolplus/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name }) })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok || !d.url) { setError(d.error || 'יצירת הקישור נכשלה'); return }
    await navigator.clipboard.writeText(d.url).catch(() => {})
    window.prompt('קישור הכניסה לטלפן (הועתק ללוח — שלח לו אותו):', d.url)
  }

  const connected = (gid: string) => !!members.find(m => m.caller_group_id === gid)?.user_id
  const unassigned = leads.filter(l => !l.assigned_caller_group_id).length

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><Building2 className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{branch.name}</h1>
          <p className="text-sm text-gray-400">ניהול סניף — טלפנים, לידים ושיוך</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between gap-3">
          <span>{error}</span><button onClick={() => setError(null)} className="text-red-400 text-xs font-bold">סגור</button>
        </div>
      )}

      {/* Callers */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Users className="w-4 h-4" /> טלפנים ({callerGroups.length})</h2>
        <div className="grid sm:grid-cols-[1fr_1fr_1fr_100px_auto] gap-2 bg-gray-50 rounded-xl p-3">
          <input value={cName} onChange={e => setCName(e.target.value)} placeholder="שם הטלפן" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          <input value={cEmail} onChange={e => setCEmail(e.target.value)} type="email" dir="ltr" placeholder="מייל" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          <input value={cLink} onChange={e => setCLink(e.target.value)} dir="ltr" placeholder="קישור תרומה (אופציונלי)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          <input value={cGoal} onChange={e => setCGoal(e.target.value)} type="number" dir="ltr" placeholder="יעד ₪" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={addCaller} disabled={busy || !cName.trim() || !cEmail.trim()} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40" style={{ background: '#4f46e5' }}><Plus className="w-4 h-4" /> הוסף</button>
        </div>
        {callerGroups.length > 0 && (
          <div className="space-y-2">
            {callerGroups.map(g => (
              <div key={g.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-800">{g.display_name}</div>
                  <div className="text-xs text-gray-400 truncate" dir="ltr">{g.caller_email} · /{g.public_slug}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {connected(g.id)
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> התחבר</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500"><Clock className="w-3.5 h-3.5" /> ממתין</span>}
                  <button onClick={() => sendInvite(g.caller_email, g.display_name)} disabled={busy} title="צור קישור כניסה והעתק" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5"><Send className="w-3.5 h-3.5" /> קישור כניסה</button>
                  <button onClick={() => removeCaller(g.id)} disabled={busy} className="w-8 h-8 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Phone className="w-4 h-4" /> לידים ({leads.length}) {unassigned > 0 && <span className="text-xs text-amber-500">· {unassigned} לא משויכים</span>}</h2>
          <div className="flex items-center gap-2">
            <button onClick={autoSplit} disabled={busy || unassigned === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40"><Shuffle className="w-4 h-4" /> חלוקה אוטומטית</button>
            <button onClick={() => setImporting(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white" style={{ background: '#4f46e5' }}><Upload className="w-4 h-4" /> ייבוא Excel</button>
          </div>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">אין עדיין לידים. ייבא קובץ Excel כדי להתחיל.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-right text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">שם</th><th className="py-2 font-semibold">טלפן</th><th className="py-2 font-semibold">סטטוס</th><th className="py-2 font-semibold">טלפן משויך</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {leads.slice(0, 200).map(l => (
                  <tr key={l.id}>
                    <td className="py-2 font-medium text-gray-800">{l.full_name || '—'}</td>
                    <td className="py-2 text-gray-500" dir="ltr">{l.phone || '—'}</td>
                    <td className="py-2 text-gray-500">{STATUS_HE[l.status] || l.status}</td>
                    <td className="py-2">
                      <select value={l.assigned_caller_group_id || ''} onChange={e => assignLead(l.id, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none">
                        <option value="">— ללא —</option>
                        {callerGroups.map(g => <option key={g.id} value={g.id}>{g.display_name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 200 && <p className="text-xs text-gray-400 text-center mt-2">מוצגים 200 ראשונים מתוך {leads.length}</p>}
          </div>
        )}
      </div>

      {importing && <ExcelImport branchId={branch.id} onClose={() => setImporting(false)} onDone={() => { setImporting(false); router.refresh() }} />}
    </div>
  )
}

/* ─── Excel import with column mapping ─── */
const FIELDS = [
  { key: 'full_name', label: 'שם' },
  { key: 'phone', label: 'טלפן' },
  { key: 'prev_amount', label: 'תרומה קודמת' },
  { key: 'email', label: 'אימייל' },
  { key: 'address', label: 'כתובת' },
  { key: 'notes', label: 'הערות' },
] as const

function ExcelImport({ branchId, onClose, onDone }: { branchId: string; onClose: () => void; onDone: () => void }) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [map, setMap] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function onFile(file: File) {
    setError(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (json.length === 0) { setError('הקובץ ריק'); return }
      const hdrs = Object.keys(json[0])
      setHeaders(hdrs); setRows(json)
      // naive auto-map by header name
      const guess: Record<string, string> = {}
      for (const f of FIELDS) {
        const hit = hdrs.find(h => h.includes(f.label) || h.toLowerCase().includes(f.key))
        if (hit) guess[f.key] = hit
      }
      setMap(guess)
    } catch {
      setError('קריאת הקובץ נכשלה. ודאו שזה קובץ Excel תקין.')
    }
  }

  async function doImport() {
    if (!map.phone && !map.full_name) { setError('יש למפות לפחות שם או טלפן'); return }
    setBusy(true); setError(null)
    const leads = rows.map(r => {
      const o: Record<string, unknown> = {}
      for (const f of FIELDS) if (map[f.key]) o[f.key] = r[map[f.key]]
      return o
    })
    const res = await fetch('/api/kafoolplus/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_id: branchId, leads, import_source: 'excel' }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(d.error || 'הייבוא נכשל'); return }
    setResult(`יובאו ${d.inserted} לידים${d.skipped ? ` (${d.skipped} כפילויות דולגו)` : ''}`)
    setTimeout(onDone, 1200)
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-black text-gray-900 text-lg">ייבוא לידים מ-Excel</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {result ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-3 text-center font-bold">{result}</p>
        ) : headers.length === 0 ? (
          <div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} className="block w-full text-sm" />
            <p className="text-xs text-gray-400 mt-2">בחרו קובץ Excel. בשלב הבא תמפו עמודות.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">מצאנו {rows.length} שורות. מפו את העמודות:</p>
            <div className="space-y-2">
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="w-28 text-sm text-gray-600">{f.label}</span>
                  <select value={map[f.key] || ''} onChange={e => setMap(m => ({ ...m, [f.key]: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                    <option value="">— לא לייבא —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={doImport} disabled={busy} className="w-full py-2.5 rounded-xl text-white font-bold disabled:opacity-50" style={{ background: '#4f46e5' }}>
              {busy ? 'מייבא…' : `ייבא ${rows.length} לידים`}
            </button>
          </>
        )}
        <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">סגור</button>
      </div>
    </div>
  )
}
