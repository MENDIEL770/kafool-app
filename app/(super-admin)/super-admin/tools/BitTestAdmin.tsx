'use client'

import { useState } from 'react'
import { Smartphone, RefreshCw } from 'lucide-react'

type Result = { campaign?: { id: string; slug: string; title: string }; result?: { success: boolean; url?: string; error?: string; raw?: unknown }; error?: string }

// Diagnostic: run Kesher SendBitTransaction and show the raw response, to see
// why the direct Bit deep-link does/doesn't come back.
export default function BitTestAdmin() {
  const [campaign, setCampaign] = useState('skaya')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('1')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<Result | null>(null)

  async function run() {
    setBusy(true); setOut(null)
    try {
      const r = await fetch('/api/super-admin/bit-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: campaign.trim(), phone: phone.trim(), amount: Number(amount) }),
      })
      setOut(await r.json())
    } catch (e) { setOut({ error: String(e) }) }
    setBusy(false)
  }

  const url = out?.result?.url

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5" dir="rtl">
      <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-xl bg-[#0A2E36] text-[#37E5E0] flex items-center justify-center"><Smartphone className="w-4 h-4" /></span>
        בדיקת ביט ישיר (SendBitTransaction)
      </h2>
      <p className="text-xs text-gray-400 mb-3">מריץ את הקריאה לקשר ומראה את התגובה הגולמית. שולח בקשת ביט אמיתית לטלפון — דחה אותה באפליקציה.</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">קמפיין (slug או id)</label><input value={campaign} onChange={e => setCampaign(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">טלפון (שלך)</label><input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="0535035770" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400" /></div>
        <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">סכום (₪)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} dir="ltr" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400" /></div>
      </div>
      <button onClick={run} disabled={busy || !phone.trim()} className="mt-3 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'שולח…' : 'הרץ בדיקה'}
      </button>

      {out && (
        <div className="mt-4 space-y-2">
          {url
            ? <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm"><b className="text-emerald-700">הצליח! קישור ביט:</b><div dir="ltr" className="mt-1 break-all font-mono text-xs text-emerald-900">{url}</div><a href={url} target="_blank" rel="noopener" className="inline-block mt-2 text-xs font-bold text-emerald-700 underline">פתח את הקישור</a></div>
            : <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700"><b>לא התקבל קישור.</b> {out.result?.error || out.error}</div>}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 font-semibold">תגובה גולמית מקשר (JSON)</summary>
            <pre dir="ltr" className="mt-2 bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto text-[11px] leading-relaxed">{JSON.stringify(out, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
