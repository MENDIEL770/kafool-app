'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, MessageCircle, Mail, Package, Search, Download, Truck, CheckCircle2, Clock } from 'lucide-react'

interface Order {
  id: string
  amount: number
  donor_name: string | null
  donor_phone: string | null
  donor_email: string | null
  payment_status: string
  created_at: string
  custom_data?: Record<string, string> | null
  kesher_transaction_id?: string | null
}
interface Campaign { id: string; title: string; slug: string; settings?: Record<string, unknown> }

// Fulfillment stages, stored in custom_data.fulfillment_status (no migration).
const STATUSES = [
  { key: 'new', label: 'חדשה', cls: 'bg-blue-100 text-blue-700', icon: Clock },
  { key: 'packed', label: 'נארזה', cls: 'bg-amber-100 text-amber-700', icon: Package },
  { key: 'shipped', label: 'יצאה למשלוח', cls: 'bg-indigo-100 text-indigo-700', icon: Truck },
  { key: 'arrived', label: 'הגיעה', cls: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
  { key: 'done', label: 'הושלמה', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { key: 'cancelled', label: 'בוטלה', cls: 'bg-red-100 text-red-600', icon: Clock },
] as const
const statusOf = (o: Order) => (o.custom_data?.fulfillment_status || 'new')
const statusMeta = (k: string) => STATUSES.find(s => s.key === k) || STATUSES[0]

// How the buyer paid — recorded on the order as 'אמצעי תשלום' (or inferred).
function payMethodOf(o: Order): string {
  const cd = o.custom_data || {}
  return cd['אמצעי תשלום'] || cd['Payment method'] || (cd.payment_method === 'stripe' ? 'כרטיס אשראי (חו״ל)' : cd.payment_method ? String(cd.payment_method) : (o.kesher_transaction_id ? 'סליקה' : '—'))
}
const payStatusOf = (o: Order) => o.payment_status === 'completed' ? { label: 'שולם', cls: 'bg-emerald-50 text-emerald-700' } : { label: 'ממתין', cls: 'bg-amber-50 text-amber-700' }

// custom_data keys that are internal / shown specially — everything else is a
// buyer-entered checkout field (address etc.) and is listed as label:value.
const HIDDEN = new Set([
  'stripe_currency', 'stripe_amount', 'payment_method', 'anonymous', 'fulfillment_status', 'fulfillment_note',
  'הזמנה', 'משלוח', 'סכום פריטים', 'אמצעי תשלום', 'Order', 'Shipping', 'Items total', 'Payment method',
])

const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')
function waLink(phone: string) { const d = phone.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}` }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }

export default function OrdersClient({ campaign, orders: initial }: { campaign: Campaign; orders: Order[] }) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(initial)
  const [filter, setFilter] = useState<string>('all')
  const [q, setQ] = useState('')

  async function patchCd(id: string, patch: Record<string, string>) {
    setOrders(os => os.map(o => o.id === id ? { ...o, custom_data: { ...(o.custom_data || {}), ...patch } } : o))
    const o = orders.find(x => x.id === id)
    await supabase.from('donations').update({ custom_data: { ...(o?.custom_data || {}), ...patch } }).eq('id', id)
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const s of STATUSES) c[s.key] = 0
    for (const o of orders) c[statusOf(o)] = (c[statusOf(o)] || 0) + 1
    return c
  }, [orders])

  const revenue = orders.reduce((s, o) => s + (o.amount || 0), 0)

  const visible = orders.filter(o => {
    if (filter !== 'all' && statusOf(o) !== filter) return false
    if (q.trim()) {
      const hay = `${o.donor_name || ''} ${o.donor_phone || ''} ${o.donor_email || ''} ${Object.values(o.custom_data || {}).join(' ')}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  })

  function exportCsv() {
    const rows = orders.map(o => {
      const cd = o.custom_data || {}
      const details = Object.entries(cd).filter(([k]) => !HIDDEN.has(k) && !k.startsWith('__')).map(([k, v]) => `${k}: ${v}`).join(' | ')
      return {
        'תאריך': fmtDate(o.created_at), 'שם': o.donor_name || '', 'טלפון': o.donor_phone || '', 'אימייל': o.donor_email || '',
        'הזמנה': cd['הזמנה'] || cd['Order'] || '', 'משלוח': cd['משלוח'] || cd['Shipping'] || '',
        'סה״כ': o.amount, 'סטטוס': statusMeta(statusOf(o)).label, 'פרטים': details, 'הערה': cd.fulfillment_note || '',
      }
    })
    const headers = Object.keys(rows[0] || { '': '' })
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = `orders-${campaign.slug}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="w-6 h-6 text-blue-600" /> הזמנות</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} הזמנות · הכנסה {ils(revenue)}</p>
        </div>
        {orders.length > 0 && (
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50">
            <Download className="w-4 h-4" /> ייצוא CSV
          </button>
        )}
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`text-sm font-semibold rounded-full px-3 py-1.5 ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>הכל ({counts.all})</button>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} className={`text-sm font-semibold rounded-full px-3 py-1.5 ${filter === s.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {s.label} ({counts[s.key] || 0})
          </button>
        ))}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש שם / טלפון / כתובת…" className="w-full rounded-xl border border-gray-200 pr-9 pl-3 py-2 text-sm" />
        </div>
      </div>

      {visible.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{orders.length === 0 ? 'עדיין אין הזמנות.' : 'אין הזמנות התואמות לסינון.'}</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map(o => {
          const cd = o.custom_data || {}
          const st = statusOf(o)
          const meta = statusMeta(st)
          const orderLine = cd['הזמנה'] || cd['Order'] || ''
          const shipping = cd['משלוח'] || cd['Shipping'] || ''
          const details = Object.entries(cd).filter(([k]) => !HIDDEN.has(k) && !k.startsWith('__'))
          const StatusIcon = meta.icon
          return (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{o.donor_name || '—'}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}><StatusIcon className="w-3 h-3" /> {meta.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{fmtDate(o.created_at)}</div>
                </div>
                <div className="text-left">
                  <div className="text-xl font-black text-blue-600">{ils(o.amount)}</div>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${payStatusOf(o).cls}`}>{payStatusOf(o).label}</span>
                    <span className="text-[11px] text-gray-400">{payMethodOf(o)}</span>
                  </div>
                </div>
              </div>

              {orderLine && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700">
                  <span className="font-semibold">הזמנה: </span>{orderLine}
                  {shipping && <span className="text-gray-400"> · משלוח {shipping}</span>}
                </div>
              )}

              {details.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  {details.map(([k, v]) => (
                    <div key={k} className="min-w-0"><span className="text-gray-400">{k}: </span><span className="text-gray-800">{v}</span></div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {/* status control */}
                <select value={st} onChange={e => patchCd(o.id, { fulfillment_status: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold">
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                {o.donor_phone && (
                  <>
                    <a href={`tel:${o.donor_phone}`} className="inline-flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Phone className="w-3.5 h-3.5" /> חיוג</a>
                    <a href={waLink(o.donor_phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-600 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                  </>
                )}
                {o.donor_email && (
                  <a href={`mailto:${o.donor_email}`} className="inline-flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Mail className="w-3.5 h-3.5" /> מייל</a>
                )}
              </div>

              <input
                defaultValue={cd.fulfillment_note || ''}
                onBlur={e => { if (e.target.value !== (cd.fulfillment_note || '')) patchCd(o.id, { fulfillment_note: e.target.value }) }}
                placeholder="הערה פנימית להזמנה (מספר מעקב, סטטוס וכו׳)…"
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
