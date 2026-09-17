'use client'

import { useMemo, useState } from 'react'
import { Webhook, ChevronDown, Search, CheckCircle2, Copy, MinusCircle, XCircle, HelpCircle } from 'lucide-react'

export interface WebhookLog {
  id: string
  source: string
  ip: string | null
  note: string | null
  created_at: string
  body: Record<string, unknown> | null
}

type Status = 'recorded' | 'duplicate' | 'ignored' | 'failed' | 'other'

const STATUS_META: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  recorded:  { label: 'נקלט',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', Icon: CheckCircle2 },
  duplicate: { label: 'כפילות', cls: 'bg-gray-100 text-gray-600 border-gray-200',        Icon: Copy },
  ignored:   { label: 'סונן',   cls: 'bg-amber-50 text-amber-700 border-amber-100',       Icon: MinusCircle },
  failed:    { label: 'נכשל',   cls: 'bg-red-50 text-red-700 border-red-100',             Icon: XCircle },
  other:     { label: 'התקבל',  cls: 'bg-blue-50 text-blue-700 border-blue-100',          Icon: HelpCircle },
}

// Classify a webhook by the outcome note the handler wrote.
function classify(note: string | null): Status {
  const n = (note || '').toLowerCase()
  if (!n) return 'other'
  if (n.startsWith('recorded') || n.includes('נרשם')) return 'recorded'
  if (n.startsWith('duplicate') || n.includes('כפיל')) return 'duplicate'
  if (n.startsWith('ignored') || n.includes('סונן') || n.includes('no campaign') || n.includes('not found')) return 'ignored'
  if (n.includes('error') || n.includes('fail') || n.includes('נכשל')) return 'failed'
  return 'other'
}

// Best-effort extraction of the routed campaign id + amount + txn from note/body.
function extract(log: WebhookLog): { campaignId: string | null; amount: string | null; txn: string | null } {
  const b = log.body || {}
  const s = (v: unknown) => (v == null ? '' : String(v))
  const noteId = (log.note || '').match(/->\s*([0-9a-f-]{36})/i)?.[1] || null
  const addData = s(b.addData || b.Details || b.adddata || b.ref)
  const bodyId = addData.split('|')[0]?.trim() || null
  const campaignId = noteId || (bodyId && /^[0-9a-f-]{36}$/i.test(bodyId) ? bodyId : null)
  const amount = s(b.total || b.Sum || b.amount).replace(/[^\d.]/g, '') || null
  const txn = s(b.transactionNumber || b.NumTransaction || b.LowProfileId || '') || null
  return { campaignId, amount, txn }
}

export default function WebhooksClient({ logs, campaignsById }: {
  logs: WebhookLog[]
  campaignsById: Record<string, { title: string; slug: string }>
}) {
  const [source, setSource] = useState<'all' | string>('all')
  const [status, setStatus] = useState<'all' | Status>('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const sources = useMemo(() => Array.from(new Set(logs.map(l => l.source))).sort(), [logs])

  const rows = useMemo(() => logs.map(l => ({ log: l, st: classify(l.note), ...extract(l) })), [logs])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, recorded: 0, duplicate: 0, ignored: 0, failed: 0, other: 0 }
    for (const r of rows) c[r.st]++
    return c
  }, [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (source !== 'all' && r.log.source !== source) return false
    if (status !== 'all' && r.st !== status) return false
    if (q.trim()) {
      const hay = `${r.log.note || ''} ${JSON.stringify(r.log.body || {})} ${r.campaignId ? campaignsById[r.campaignId]?.title || '' : ''}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  }), [rows, source, status, q, campaignsById])

  const fmt = (iso: string) => new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Webhook className="w-5 h-5" /></span>
          ניתוח וובהוקים
        </h1>
        <p className="text-sm text-gray-400 mt-1">כל קריאת תשלום נכנסת (קשר / נדרים / CardCom), הסינון לקמפיין, והתוצאה — נקלט, כפילות, סונן או נכשל.</p>
      </div>

      {/* Status filter cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([['all', 'הכל'], ['recorded', STATUS_META.recorded.label], ['duplicate', STATUS_META.duplicate.label], ['ignored', STATUS_META.ignored.label], ['failed', STATUS_META.failed.label], ['other', STATUS_META.other.label]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setStatus(key as 'all' | Status)}
            className={`rounded-xl border p-3 text-right transition-all ${status === key ? 'ring-2 ring-blue-300 border-blue-200 bg-white' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
            <div className="text-2xl font-black text-gray-900">{counts[key] ?? 0}</div>
            <div className="text-[11px] font-semibold text-gray-500">{label}</div>
          </button>
        ))}
      </div>

      {/* Source + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {(['all', ...sources] as string[]).map(sv => (
            <button key={sv} onClick={() => setSource(sv)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${source === sv ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {sv === 'all' ? 'כל המקורות' : sv}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש בקמפיין / תוכן / הערה…"
            className="w-full rounded-xl border border-gray-200 pr-9 pl-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">אין וובהוקים להצגה</div>
        ) : filtered.map(({ log, st, campaignId, amount, txn }) => {
          const meta = STATUS_META[st]
          const cam = campaignId ? campaignsById[campaignId] : null
          const open = openId === log.id
          return (
            <div key={log.id} className="border-b border-gray-50 last:border-0">
              <button onClick={() => setOpenId(open ? null : log.id)} className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-gray-50/70 transition-colors">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.cls}`}>
                  <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
                </span>
                <span className="text-xs font-mono text-gray-400 shrink-0 w-14">{log.source}</span>
                <span className="min-w-0 flex-1 text-sm text-gray-700 truncate">
                  {cam ? <span className="font-semibold text-gray-800">{cam.title}</span>
                       : campaignId ? <span className="text-red-500 font-mono text-xs">קמפיין לא נמצא: {campaignId.slice(0, 8)}…</span>
                       : <span className="text-gray-400">— ללא שיוך —</span>}
                  {amount && <span className="text-gray-400"> · ₪{amount}</span>}
                  {txn && <span className="text-gray-300 text-xs"> · txn {txn}</span>}
                </span>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">{fmt(log.created_at)}</span>
                <ChevronDown className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-2">
                  {log.note && <div className="text-xs"><span className="font-semibold text-gray-500">תוצאה:</span> <span className="text-gray-700">{log.note}</span></div>}
                  <div className="text-[11px] text-gray-400">IP: {log.ip || '—'}</div>
                  <pre dir="ltr" className="text-[11px] bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto max-h-72">{JSON.stringify(log.body, null, 2)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
