'use client'

import { useState } from 'react'
import { Loader2, UploadCloud, X, CheckCircle2 } from 'lucide-react'

const INDEX_SHEET = 'סניפים - אינדקס'
const YEAR_COLS: Record<number, number> = { 3: 2022, 4: 2023, 5: 2024, 6: 2025 } // D-G (0-indexed)

interface ParsedLead {
  full_name: string; phone: string | null; email: string | null
  donation_history: { year: number; amount: number }[]
  ambassador_note: string | null; is_vip: boolean; needs_review: boolean
}
interface ParsedBranch { name: string; leads: ParsedLead[]; total: number; vip: number; review: number }

function normPhone(p: unknown): string | null {
  if (p == null) return null
  let s = String(p).replace(/[^\d+]/g, '')
  if (!s) return null
  if (s.startsWith('+972')) s = '0' + s.slice(4)
  else if (s.startsWith('972')) s = '0' + s.slice(3)
  return s
}
const isIsraeli = (p: string | null) => !!p && p.startsWith('05') && p.length === 10

export default function NetworkImport({ masterCampaignId, onClose, onDone }: {
  masterCampaignId: string; onClose: () => void; onDone: () => void
}) {
  const [parsing, setParsing] = useState(false)
  const [branches, setBranches] = useState<ParsedBranch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function onFile(file: File) {
    setError(null); setParsing(true); setBranches([])
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const out: ParsedBranch[] = []
      for (const sheetName of wb.SheetNames) {
        if (sheetName === INDEX_SHEET) continue
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
        const r1 = String((rows[0] as unknown[])?.[0] ?? '')
        const dash = r1.includes('–') ? '–' : '-'
        const branchName = r1.includes(dash) ? r1.split(dash)[1].trim() : sheetName
        const leads: ParsedLead[] = []
        for (let i = 3; i < rows.length; i++) {
          const row = rows[i] as unknown[]
          if (!row) continue
          const name = row[0]
          if (!name || !String(name).trim()) continue
          const phone = normPhone(row[1])
          const email = row[2] ? String(row[2]).trim() : null
          const dh: { year: number; amount: number }[] = []
          for (const [col, year] of Object.entries(YEAR_COLS)) {
            const v = row[+col]
            if (typeof v === 'number' && v > 0) dh.push({ year, amount: Math.round(v) })
          }
          const amb = row[7] ? String(row[7]).trim() : null
          const prevTotal = dh.reduce((s, d) => s + d.amount, 0)
          leads.push({
            full_name: String(name).trim(), phone, email, donation_history: dh,
            ambassador_note: amb, is_vip: prevTotal >= 10000,
            needs_review: (!!phone && !isIsraeli(phone)) || !phone,
          })
        }
        out.push({
          name: branchName, leads,
          total: leads.reduce((s, l) => s + l.donation_history.reduce((a, d) => a + d.amount, 0), 0),
          vip: leads.filter(l => l.is_vip).length,
          review: leads.filter(l => l.needs_review).length,
        })
      }
      if (out.length === 0) { setError('לא נמצאו גיליונות סניפים בקובץ'); }
      setBranches(out)
    } catch {
      setError('קריאת הקובץ נכשלה. ודאו שזה קובץ Excel תקין.')
    }
    setParsing(false)
  }

  async function runImport() {
    setError(null)
    setProgress({ done: 0, total: branches.length })
    let failed = 0
    for (let i = 0; i < branches.length; i++) {
      const b = branches[i]
      const res = await fetch('/api/kafoolplus/network-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_campaign_id: masterCampaignId, name: b.name, leads: b.leads }),
      })
      if (!res.ok) failed++
      setProgress({ done: i + 1, total: branches.length })
    }
    const totalLeads = branches.reduce((s, b) => s + b.leads.length, 0)
    setResult(`יובאו ${branches.length - failed}/${branches.length} סניפים · ${totalLeads.toLocaleString()} לידים${failed ? ` · ${failed} נכשלו` : ''}`)
    setTimeout(onDone, 1600)
  }

  const totalLeads = branches.reduce((s, b) => s + b.leads.length, 0)
  const totalVip = branches.reduce((s, b) => s + b.vip, 0)

  return (
    <div dir="rtl" className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">ייבוא רשת סניפים מ-Excel</h2>
          <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {result ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-4 text-center font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> {result}</p>
        ) : progress ? (
          <div className="space-y-2 py-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="text-sm text-center text-gray-600">מייבא… {progress.done}/{progress.total} סניפים</p>
          </div>
        ) : branches.length === 0 ? (
          <div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-indigo-300">
              {parsing ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <UploadCloud className="w-8 h-8 text-gray-300" />}
              <span className="text-sm text-gray-500">{parsing ? 'קורא את הקובץ…' : 'בחרו את קובץ רשימות התורמים (xlsx)'}</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            <p className="text-xs text-gray-400 mt-2">כל גיליון = סניף. גיליון האינדקס מדולג. שמות סניפים נקראים משורה 1.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl py-2"><div className="text-xl font-black text-gray-900">{branches.length}</div><div className="text-[11px] text-gray-400">סניפים</div></div>
              <div className="bg-gray-50 rounded-xl py-2"><div className="text-xl font-black text-gray-900">{totalLeads.toLocaleString()}</div><div className="text-[11px] text-gray-400">לידים</div></div>
              <div className="bg-gray-50 rounded-xl py-2"><div className="text-xl font-black text-gray-900">{totalVip}</div><div className="text-[11px] text-gray-400">VIP</div></div>
            </div>
            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="text-right text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 px-3 font-semibold">סניף</th><th className="py-2 px-2 font-semibold">לידים</th><th className="py-2 px-2 font-semibold">תרומות (₪)</th><th className="py-2 px-2 font-semibold">VIP</th><th className="py-2 px-2 font-semibold">לבדיקה</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {branches.map((b, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 font-medium text-gray-800 truncate max-w-[200px]">{b.name}</td>
                      <td className="py-1.5 px-2 text-gray-500">{b.leads.length}</td>
                      <td className="py-1.5 px-2 text-gray-500">₪{b.total.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-gray-500">{b.vip || ''}</td>
                      <td className="py-1.5 px-2 text-amber-500">{b.review || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={runImport} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: '#4f46e5' }}>
              ייבא {branches.length} סניפים · {totalLeads.toLocaleString()} לידים
            </button>
            <p className="text-[11px] text-gray-400 text-center">הסניפים ייווצרו ללא רכזים — תזין מיילי רכזים אחר כך לכל סניף.</p>
          </>
        )}
      </div>
    </div>
  )
}
