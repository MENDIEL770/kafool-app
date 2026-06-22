'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, Check, X, Loader2 } from 'lucide-react'

export interface AccessRequest {
  id: string; email: string; full_name: string | null; note: string | null; created_at: string
}
export interface CampaignOption { id: string; name: string; orgName: string | null }

export default function KafoolRequestsClient({ requests, campaigns }: { requests: AccessRequest[]; campaigns: CampaignOption[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picks, setPicks] = useState<Record<string, { campaign: string; branch: string }>>({})

  async function api(body: unknown): Promise<boolean> {
    setError(null)
    const res = await fetch('/api/kafoolplus/access-request', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'הפעולה נכשלה'); return false }
    return true
  }
  async function assign(r: AccessRequest) {
    const pick = picks[r.id]
    if (!pick?.campaign) { setError('בחר קמפיין לשיוך'); return }
    setBusy(r.id)
    const ok = await api({ id: r.id, master_campaign_id: pick.campaign, branch_name: pick.branch })
    setBusy(null)
    if (ok) router.refresh()
  }
  async function reject(r: AccessRequest) {
    if (!confirm('לדחות את הפנייה?')) return
    setBusy(r.id)
    const ok = await api({ id: r.id, action: 'reject' })
    setBusy(null)
    if (ok) router.refresh()
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white"><Inbox className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">פניות גישה — Kafool+</h1>
          <p className="text-sm text-gray-400">{requests.length} פניות ממתינות</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {requests.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center text-gray-400">אין פניות ממתינות.</div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const pick = picks[r.id] || { campaign: '', branch: '' }
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800">{r.full_name || '—'}</div>
                    <div className="text-xs text-gray-400" dir="ltr">{r.email}</div>
                    {r.note && <div className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg px-3 py-2">{r.note}</div>}
                  </div>
                  <span className="text-[11px] text-gray-300 shrink-0">{new Date(r.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                  <select value={pick.campaign} onChange={e => setPicks(s => ({ ...s, [r.id]: { ...pick, campaign: e.target.value } }))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white outline-none">
                    <option value="">— שייך לקמפיין —</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.orgName ? ` · ${c.orgName}` : ''}</option>)}
                  </select>
                  <input value={pick.branch} onChange={e => setPicks(s => ({ ...s, [r.id]: { ...pick, branch: e.target.value } }))}
                    placeholder="שם הסניף (אופציונלי)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <button onClick={() => assign(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50" style={{ background: '#4f46e5' }}>
                    {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} שייך כרכז
                  </button>
                  <button onClick={() => reject(r)} disabled={busy === r.id} className="w-9 h-9 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
