'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, MessageCircle, Mail, Package, Search, Download, Truck, CheckCircle2, Clock, FileText, Plus, X, Minus } from 'lucide-react'

// ── Catalog types (from campaign.settings) — for the manual-order form ──
interface QtyTier { qty: number; price: number }
interface Product { name: string; price: number; sale_price?: number | null; qty_tiers?: QtyTier[] }
interface Shipping { cost?: number; free_over?: number | null }
interface CheckoutField { key: string; label: string; type?: string; required?: boolean; enabled?: boolean }
const DEFAULT_FIELDS: CheckoutField[] = [
  { key: 'full_name', label: 'שם מלא', required: true, enabled: true },
  { key: 'phone', label: 'טלפון', type: 'tel', required: true, enabled: true },
  { key: 'email', label: 'אימייל', type: 'email', enabled: true },
  { key: 'city', label: 'עיר', enabled: true },
  { key: 'street', label: 'רחוב', enabled: true },
  { key: 'house_number', label: 'מספר בית', enabled: true },
]
// Greedy bundle pricing — mirrors the server + public checkout.
function lineTotal(p: Product, q: number): number {
  const unit = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price
  const tiers = [...(p.qty_tiers || [])].filter(t => t.qty > 1 && t.price > 0).sort((a, b) => b.qty - a.qty)
  let remaining = q, total = 0
  for (const t of tiers) { if (remaining >= t.qty) { const b = Math.floor(remaining / t.qty); total += b * t.price; remaining -= b * t.qty } }
  return total + remaining * unit
}
const PAY_METHODS = [
  { key: 'cash', label: 'מזומן' },
  { key: 'bit', label: 'ביט / פייבוקס' },
  { key: 'transfer', label: 'העברה בנקאית' },
  { key: 'other', label: 'אחר / צ׳ק' },
] as const

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
  receipt_url?: string | null
  kesher_raw?: Record<string, unknown> | null
}
interface Campaign { id: string; title: string; slug: string; settings?: Record<string, unknown> }

// Manager-entered order (paid cash / Bit / transfer / cheque). Posts to the
// manual-order route which recomputes the total server-side, then prepends it.
function NewOrderModal({ campaign, onClose, onCreated }: { campaign: Campaign; onClose: () => void; onCreated: (o: Order) => void }) {
  const s = (campaign.settings || {}) as { products?: Product[]; shipping?: Shipping; checkout_fields?: CheckoutField[] }
  const products = Array.isArray(s.products) ? s.products : []
  const shipping = s.shipping || {}
  const fieldDefs = (Array.isArray(s.checkout_fields) && s.checkout_fields.length ? s.checkout_fields : DEFAULT_FIELDS).filter(f => f.enabled !== false)

  const [qty, setQty] = useState<Record<number, number>>({})
  const [fields, setFields] = useState<Record<string, string>>({})
  const [method, setMethod] = useState<string>('cash')
  const [paid, setPaid] = useState(true)
  const [note, setNote] = useState('')
  const [override, setOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setQ = (i: number, d: number) => setQty(q => ({ ...q, [i]: Math.max(0, (q[i] || 0) + d) }))
  const subtotal = products.reduce((sum, p, i) => sum + lineTotal(p, qty[i] || 0), 0)
  const shipCost = subtotal <= 0 ? 0
    : (shipping.free_over != null && shipping.free_over > 0 && subtotal >= shipping.free_over) ? 0
    : Number(shipping.cost) || 0
  const computed = subtotal + shipCost
  const total = override.trim() ? Number(override) || 0 : computed

  async function submit() {
    setSaving(true); setError(null)
    const quantities: Record<string, number> = {}
    for (const [i, q] of Object.entries(qty)) if (q > 0) quantities[i] = q
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/manual-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantities, fields, payment_method: method, paid, note, amount_override: override.trim() ? Number(override) : null }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'השמירה נכשלה'); setSaving(false); return }
      onCreated(d.order)
    } catch { setError('השמירה נכשלה'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" dir="rtl" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> הזמנה חדשה (תשלום ידני)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">מוצרים</div>
              {products.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.name || `מוצר ${i + 1}`}</div>
                    <div className="text-xs text-gray-400">{ils(p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price)} ליח׳</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setQ(i, -1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-6 text-center text-sm font-bold">{qty[i] || 0}</span>
                    <button type="button" onClick={() => setQ(i, +1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* customer fields */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">פרטי לקוח</div>
            <div className="grid grid-cols-2 gap-2">
              {fieldDefs.map(f => (
                <input key={f.key} value={fields[f.key] || ''} onChange={e => setFields(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.label + (f.required ? ' *' : '')} type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              ))}
            </div>
          </div>

          {/* payment method */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">אמצעי תשלום</div>
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map(m => (
                <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                  className={`text-sm font-semibold rounded-full px-3 py-1.5 border ${method === m.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}>{m.label}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pt-1">
              <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="w-4 h-4" />
              התשלום כבר התקבל (סמן כ"שולם")
            </label>
          </div>

          {/* note + total */}
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="הערה פנימית (אופציונלי)" className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center justify-between rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">סה״כ לתשלום</span>
              <input value={override} onChange={e => setOverride(e.target.value.replace(/[^\d.]/g, ''))} inputMode="numeric" placeholder={String(Math.round(computed))} dir="ltr"
                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center" />
            </div>
            <div className="text-lg font-black text-blue-600">{ils(total)}</div>
          </div>
          {subtotal > 0 && !override.trim() && <div className="text-xs text-gray-400 text-left">פריטים {ils(subtotal)} · משלוח {shipCost > 0 ? ils(shipCost) : 'חינם'}</div>}

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onClose} className="text-sm font-semibold text-gray-500 px-4 py-2 hover:text-gray-700">ביטול</button>
          <button onClick={submit} disabled={saving || total <= 0} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-5 py-2">
            {saving ? 'שומר...' : 'שמור הזמנה'}
          </button>
        </div>
      </div>
    </div>
  )
}

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

// The payment receipt/invoice — dedicated column, or Kesher's ezcount link that
// already sits in kesher_raw on older orders (various casings).
function receiptOf(o: Order): string | null {
  if (o.receipt_url) return o.receipt_url
  const raw = (o.kesher_raw || {}) as Record<string, unknown>
  for (const k of ['receiptLink', 'receipturl', 'receipt_url', 'receiptUrl', 'ReceiptLink', 'ReceiptUrl']) {
    const v = raw[k]
    if (typeof v === 'string' && v.startsWith('http')) return v
  }
  return null
}

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
  const [newOpen, setNewOpen] = useState(false)
  const [rcSend, setRcSend] = useState<Record<string, 'sending' | 'sent' | 'err'>>({})

  // Email the receipt to the customer through the system (Resend), not the manager's mail app.
  async function sendReceiptEmail(o: Order) {
    setRcSend(m => ({ ...m, [o.id]: 'sending' }))
    try {
      const r = await fetch(`/api/campaigns/${campaign.id}/send-receipt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId: o.id }),
      })
      setRcSend(m => ({ ...m, [o.id]: r.ok ? 'sent' : 'err' }))
      if (!r.ok) { const d = await r.json().catch(() => ({})); if (d.error) alert(d.error) }
    } catch { setRcSend(m => ({ ...m, [o.id]: 'err' })) }
  }

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
        'סה״כ': o.amount, 'סטטוס': statusMeta(statusOf(o)).label, 'פרטים': details, 'הערה': cd.fulfillment_note || '', 'קבלה': receiptOf(o) || '',
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
        <div className="flex items-center gap-2">
          <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-3 py-2">
            <Plus className="w-4 h-4" /> הזמנה חדשה
          </button>
          {orders.length > 0 && (
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50">
              <Download className="w-4 h-4" /> ייצוא CSV
            </button>
          )}
        </div>
      </div>

      {newOpen && (
        <NewOrderModal campaign={campaign} onClose={() => setNewOpen(false)}
          onCreated={o => { setOrders(os => [o, ...os]); setNewOpen(false) }} />
      )}

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
          const receipt = receiptOf(o)
          const rcMsg = `שלום${o.donor_name ? ' ' + o.donor_name : ''}, מצורפת הקבלה עבור ${ils(o.amount)}: ${receipt}`
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

              {/* קבלה — צפייה, הורדה ושליחה ללקוח ישירות מהמערכת */}
              {receipt && (
                <div className="flex items-center gap-2 flex-wrap rounded-xl bg-blue-50/50 border border-blue-100 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"><FileText className="w-4 h-4" /> קבלה</span>
                  <a href={receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50">צפייה / הורדה</a>
                  {o.donor_phone && (
                    <a href={`${waLink(o.donor_phone)}?text=${encodeURIComponent(rcMsg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-600 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"><MessageCircle className="w-3.5 h-3.5" /> שלח בוואטסאפ</a>
                  )}
                  {o.donor_email && (
                    <button
                      type="button"
                      onClick={() => sendReceiptEmail(o)}
                      disabled={rcSend[o.id] === 'sending' || rcSend[o.id] === 'sent'}
                      className="inline-flex items-center gap-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {rcSend[o.id] === 'sending' ? 'שולח…' : rcSend[o.id] === 'sent' ? 'נשלח ✓' : rcSend[o.id] === 'err' ? 'שגיאה — נסה שוב' : 'שלח במייל'}
                    </button>
                  )}
                </div>
              )}

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
