'use client'

import { useMemo, useState } from 'react'

// ── Types (mirror the products editor) ───────────────────────────────────────
interface QtyTier { qty: number; price: number }
interface Product {
  name: string; description?: string | null; images?: string[]; video_url?: string | null
  price: number; sale_price?: number | null; qty_tiers?: QtyTier[]; max_qty?: number | null
}
interface CheckoutField { key: string; label: string; type: 'text' | 'tel' | 'email' | 'textarea'; required?: boolean; enabled?: boolean }
interface Shipping { cost?: number; free_over?: number | null }
interface BankDetails { account_name?: string | null; bank?: string | null; branch?: string | null; account_number?: string | null; note?: string | null }

interface Campaign {
  id: string; slug: string; title: string
  settings: Record<string, unknown> & {
    products?: Product[]; shipping?: Shipping; checkout_fields?: CheckoutField[]
    primary_color?: string; banners?: { url: string; sort_order?: number }[]; mobile_banners?: { url: string; sort_order?: number }[]
    about_text?: string | null
  }
  cover_image_url?: string | null
}

interface Props {
  campaign: Campaign
  initialLang?: 'he' | 'en'
  paymentUrls: { one_time: string; hok?: string; bit?: string; bank?: string; one_time_en?: string }
  paymentProvider: string
  nedarim: { mosad: string; apiValid: string; active: boolean } | null
}

const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')

// Greedy bundle pricing: qty_tiers are "buy `qty` for total `price`". Use the
// largest bundle that fits as many times as possible, remainder at unit price.
function lineTotal(p: Product, q: number): number {
  const unit = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price
  const tiers = [...(p.qty_tiers || [])].filter(t => t.qty > 1 && t.price > 0).sort((a, b) => b.qty - a.qty)
  let remaining = q, total = 0
  for (const t of tiers) {
    if (remaining >= t.qty) { const b = Math.floor(remaining / t.qty); total += b * t.price; remaining -= b * t.qty }
  }
  return total + remaining * unit
}

export default function ProductSalesClient({ campaign, initialLang, paymentUrls, paymentProvider, nedarim }: Props) {
  const en = initialLang === 'en'
  const s = campaign.settings || {}
  const primary = s.primary_color || '#2563eb'
  const products = useMemo(() => (Array.isArray(s.products) ? s.products : []).filter(p => p && p.name && p.price > 0), [s.products])
  const shipping: Shipping = s.shipping || {}
  const fields = useMemo(() => (Array.isArray(s.checkout_fields) ? s.checkout_fields : []).filter(f => f.enabled !== false && f.label), [s.checkout_fields])
  const firstUrl = (arr?: { url: string; sort_order?: number }[]) => (arr || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.url
  const desktopBanner = firstUrl(s.banners) || campaign.cover_image_url || ''
  const mobileBanner = firstUrl(s.mobile_banners) || desktopBanner   // dedicated mobile banner, falls back to desktop

  const [qty, setQty] = useState<Record<number, number>>({})
  const setQ = (i: number, v: number) => setQty(q => ({ ...q, [i]: Math.max(0, v) }))

  const lines = products.map((p, i) => ({ p, i, q: qty[i] || 0 })).filter(l => l.q > 0)
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l.p, l.q), 0)
  const shipCost = subtotal <= 0 ? 0
    : (shipping.free_over != null && shipping.free_over > 0 && subtotal >= shipping.free_over) ? 0
    : (Number(shipping.cost) || 0)
  const grandTotal = subtotal + shipCost
  const itemCount = lines.reduce((n, l) => n + l.q, 0)

  const [checkout, setCheckout] = useState(false)
  const [detail, setDetail] = useState<number | null>(null)   // product-detail modal (enlarged image + full description)

  return (
    <div dir={en ? 'ltr' : 'rtl'} className="min-h-screen bg-gray-50 text-gray-900" style={{ ['--pc' as string]: primary }}>
      {/* Banner — the dedicated mobile banner on phones, the desktop one from md up */}
      {(mobileBanner || desktopBanner) && (
        <div className="w-full bg-white">
          {mobileBanner && <img src={mobileBanner} alt={campaign.title} className="w-full max-h-[560px] object-contain mx-auto md:hidden" />}
          {desktopBanner && <img src={desktopBanner} alt={campaign.title} className="w-full max-h-[520px] object-contain mx-auto hidden md:block" />}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 pb-40 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black">{campaign.title}</h1>
          {s.about_text && <div className="mt-2 text-sm text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.about_text }} />}
        </div>

        {products.length === 0 && (
          <p className="text-center text-gray-400 py-16">{en ? 'No products yet.' : 'אין מוצרים עדיין.'}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {products.map((p, i) => {
            const q = qty[i] || 0
            const unit = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price
            const onSale = p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price
            const tiers = (p.qty_tiers || []).filter(t => t.qty > 1 && t.price > 0)
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <ProductImages images={p.images || []} name={p.name} onOpen={() => setDetail(i)} />
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2 cursor-pointer" onClick={() => setDetail(i)}>{p.name}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black" style={{ color: primary }}>{ils(unit)}</span>
                    {onSale && <span className="text-xs text-gray-400 line-through">{ils(p.price)}</span>}
                  </div>
                  {tiers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tiers.sort((a, b) => a.qty - b.qty).map((t, ti) => (
                        <span key={ti} className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: `${primary}14`, color: primary }}>
                          {en ? `${t.qty} for ${ils(t.price)}` : `${t.qty} ב-${ils(t.price)}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.description && <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>}
                  {(p.description || (p.images || []).length > 0) && (
                    <button type="button" onClick={() => setDetail(i)} className="text-[11px] font-semibold text-right" style={{ color: primary }}>
                      {en ? 'More details ›' : 'פרטים נוספים ›'}
                    </button>
                  )}
                  {p.video_url && (
                    <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold" style={{ color: primary }}>
                      {en ? '▶ Watch' : '▶ סרטון'}
                    </a>
                  )}
                  <div className="mt-auto pt-1.5">
                    <QtyStepper q={q} onChange={v => setQ(i, v)} max={p.max_qty || undefined} primary={primary} en={en} block />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky cart bar — always pinned to the bottom, even with an empty cart */}
      {products.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.2)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="text-sm">
              {itemCount > 0 ? (
                <>
                  <div className="text-gray-500">
                    {en ? `${itemCount} items` : `${itemCount} פריטים`}
                    {shipCost > 0 ? ` · ${en ? 'shipping' : 'משלוח'} ${ils(shipCost)}` : subtotal > 0 ? ` · ${en ? 'free shipping' : 'משלוח חינם'}` : ''}
                  </div>
                  <div className="text-xl font-black" style={{ color: primary }}>{ils(grandTotal)}</div>
                </>
              ) : (
                <div className="text-gray-400">{en ? 'Your cart is empty — add products' : 'העגלה ריקה — הוסיפו מוצרים'}</div>
              )}
            </div>
            <button
              onClick={() => setCheckout(true)}
              disabled={itemCount === 0}
              className="rounded-xl px-6 py-3 text-white font-bold shadow disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: primary }}
            >
              {en ? 'Checkout' : 'המשך לתשלום'}
            </button>
          </div>
        </div>
      )}

      {checkout && (
        <CheckoutModal
          en={en} primary={primary} fields={fields} lines={lines} subtotal={subtotal} shipCost={shipCost} grandTotal={grandTotal}
          campaign={campaign} paymentUrls={paymentUrls} paymentProvider={paymentProvider} nedarim={nedarim}
          onClose={() => setCheckout(false)}
        />
      )}

      {detail !== null && products[detail] && (
        <ProductDetailModal
          product={products[detail]} primary={primary} en={en}
          q={qty[detail] || 0} onQty={v => setQ(detail, v)} onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

// ── Product detail modal — enlarged images + full description ─────────────────
function ProductDetailModal({ product, primary, en, q, onQty, onClose }: {
  product: Product; primary: string; en: boolean; q: number; onQty: (v: number) => void; onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const imgs = product.images || []
  const unit = product.sale_price != null && product.sale_price > 0 ? product.sale_price : product.price
  const onSale = product.sale_price != null && product.sale_price > 0 && product.sale_price < product.price
  const tiers = (product.qty_tiers || []).filter(t => t.qty > 1 && t.price > 0)
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[94vh] relative flex flex-col" onClick={e => e.stopPropagation()} dir={en ? 'ltr' : 'rtl'}>
        {/* Close — fixed to the modal (outside the scroll area) so it never moves */}
        <button onClick={onClose} className="absolute top-2 left-2 z-30 w-9 h-9 rounded-full bg-black/50 text-white text-xl leading-none flex items-center justify-center hover:bg-black/70" aria-label="סגור">×</button>
        <div className="overflow-y-auto">
        <div className="relative bg-gray-100">
          {imgs[idx] && <img src={imgs[idx]} alt={product.name} className="w-full max-h-[60vh] object-contain bg-black/5" />}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
              {imgs.map((_, k) => (
                <button key={k} onClick={() => setIdx(k)} className={`h-2 rounded-full transition-all ${k === idx ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />
              ))}
            </div>
          )}
        </div>
        {imgs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {imgs.map((u, k) => (
              <img key={k} src={u} onClick={() => setIdx(k)} className={`w-16 h-16 object-cover rounded-lg cursor-pointer shrink-0 border-2 ${k === idx ? '' : 'border-transparent opacity-70'}`} style={k === idx ? { borderColor: primary } : {}} />
            ))}
          </div>
        )}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-black">{product.name}</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black" style={{ color: primary }}>{ils(unit)}</span>
            {onSale && <span className="text-sm text-gray-400 line-through">{ils(product.price)}</span>}
          </div>
          {tiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tiers.sort((a, b) => a.qty - b.qty).map((t, ti) => (
                <span key={ti} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: `${primary}14`, color: primary }}>
                  {en ? `${t.qty} for ${ils(t.price)}` : `${t.qty} ב-${ils(t.price)}`}
                </span>
              ))}
            </div>
          )}
          {product.description && <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{product.description}</p>}
          {product.video_url && (
            <a href={product.video_url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold" style={{ color: primary }}>
              {en ? '▶ Watch video' : '▶ צפו בסרטון'}
            </a>
          )}
          <div className="pt-1"><QtyStepper q={q} onChange={onQty} max={product.max_qty || undefined} primary={primary} en={en} block /></div>
        </div>
        </div>
      </div>
    </div>
  )
}

// ── Product image carousel (simple) ──────────────────────────────────────────
function ProductImages({ images, name, onOpen }: { images: string[]; name: string; onOpen?: () => void }) {
  const [idx, setIdx] = useState(0)
  if (!images.length) return null
  return (
    <div className="relative bg-gray-100">
      <img src={images[idx]} alt={name} onClick={onOpen} className={`w-full aspect-square object-cover ${onOpen ? 'cursor-zoom-in' : ''}`} />
      {images.length > 1 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, k) => (
            <button key={k} onClick={() => setIdx(k)} className={`h-1.5 rounded-full transition-all ${k === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} aria-label={`image ${k + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function QtyStepper({ q, onChange, max, primary, en, block }: { q: number; onChange: (v: number) => void; max?: number; primary: string; en: boolean; block?: boolean }) {
  if (q === 0) return (
    <button onClick={() => onChange(1)} className={`rounded-xl border-2 py-2 text-sm font-bold ${block ? 'w-full' : 'px-4 shrink-0'}`} style={{ borderColor: primary, color: primary }}>
      {en ? 'Add' : 'הוסף'}
    </button>
  )
  return (
    <div className={`flex items-center gap-2 ${block ? 'justify-between' : 'shrink-0'}`}>
      <button onClick={() => onChange(q - 1)} className="w-8 h-8 rounded-lg border border-gray-200 text-lg leading-none">−</button>
      <span className="text-center font-bold tabular-nums flex-1">{q}</span>
      <button onClick={() => onChange(q + 1)} disabled={max != null && q >= max} className="w-8 h-8 rounded-lg text-lg leading-none text-white disabled:opacity-40" style={{ backgroundColor: primary }}>+</button>
    </div>
  )
}

// ── Checkout modal ───────────────────────────────────────────────────────────
type Line = { p: Product; i: number; q: number }
function CheckoutModal({ en, primary, fields, lines, subtotal, shipCost, grandTotal, campaign, paymentUrls, paymentProvider, nedarim, onClose }: {
  en: boolean; primary: string; fields: CheckoutField[]; lines: Line[]; subtotal: number; shipCost: number; grandTotal: number
  campaign: Campaign; paymentUrls: Props['paymentUrls']; paymentProvider: string; nedarim: Props['nedarim']; onClose: () => void
}) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [step, setStep] = useState<'details' | 'method' | 'payment'>('details')
  const [payUrl, setPayUrl] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [bankView, setBankView] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const set = (k: string, v: string) => setVals(s => ({ ...s, [k]: v }))

  const find = (key: string) => fields.find(f => f.key === key)
  const nameField = find('full_name') || fields.find(f => f.type === 'text')
  const phoneField = find('phone') || fields.find(f => f.type === 'tel')
  const emailField = find('email') || fields.find(f => f.type === 'email')

  const missing = fields.filter(f => f.required && !(vals[f.key] || '').trim())
  const valid = missing.length === 0

  // Available payment methods for this campaign: those with a configured link
  // (bank also when manual details exist), minus any the manager hid.
  const cs = (campaign.settings || {}) as { payment?: { disabled?: string[] }; bank_details?: BankDetails }
  const disabled = cs.payment?.disabled || []
  const bank = cs.bank_details
  const hasBank = !!(bank && (bank.account_name || bank.bank || bank.account_number || bank.note))
  const methods = ([
    { key: 'one_time', label: en ? 'Credit card' : 'כרטיס אשראי', url: (en && paymentUrls.one_time_en) || paymentUrls.one_time },
    { key: 'bit', label: en ? 'Bit' : 'ביט', url: paymentUrls.bit || '' },
    { key: 'bank', label: en ? 'Bank transfer' : 'העברה בנקאית', url: paymentUrls.bank || '' },
  ] as { key: string; label: string; url: string }[]).filter(m => (m.url || (m.key === 'bank' && hasBank)) && !disabled.includes(m.key))

  const buyer = () => ({
    name: (nameField ? vals[nameField.key] : '')?.trim() || '',
    phone: (phoneField ? vals[phoneField.key] : '')?.trim() || '',
    email: (emailField ? vals[emailField.key] : '')?.trim() || '',
  })

  // Record the order (lead) — cart + shipping + fields + payment method — so it
  // lands in the orders table via the same intent → payment-callback attachment.
  function recordIntent(method: { key: string; label: string }) {
    const { name, phone, email } = buyer()
    const labeled: Record<string, string> = {}
    for (const f of fields) { const v = (vals[f.key] || '').trim(); if (v) labeled[f.label] = v }
    labeled[en ? 'Order' : 'הזמנה'] = lines.map(l => `${l.p.name} ×${l.q}`).join(', ')
    labeled[en ? 'Shipping' : 'משלוח'] = shipCost > 0 ? ils(shipCost) : (en ? 'Free' : 'חינם')
    labeled[en ? 'Items total' : 'סכום פריטים'] = ils(subtotal)
    labeled[en ? 'Payment method' : 'אמצעי תשלום'] = method.label   // survives attachCustomData (no __ prefix)
    if (grandTotal > 0) {
      fetch('/api/donations/intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, phone: phone || null, amount: grandTotal, groupSlug: null, customData: labeled, donorName: name || null, paymentMethod: method.key, donorEmail: email || null }),
        keepalive: true,
      }).catch(() => {})
    }
  }

  // Route to the chosen method's clearing link (or the manual bank details).
  function startMethod(m: { key: string; label: string; url: string }) {
    recordIntent(m)
    setPayMethod(m.key)
    if (m.key === 'bank' && !m.url && hasBank) { setBankView(true); setPayUrl(''); setStep('payment'); return }
    if (!m.url) { setBankView(false); setPayUrl(''); setStep('payment'); return }
    const { name, phone, email } = buyer()
    const isNedarim = paymentProvider === 'nedarim'
    const params = new URLSearchParams()
    const parts = name.split(' '); const firstName = parts[0] || name, lastName = parts.slice(1).join(' ')
    if (isNedarim) {
      params.set('Amount', String(grandTotal)); params.set('Currency', '1')
      if (firstName) params.set('FirstName', firstName); if (lastName) params.set('LastName', lastName)
      if (phone) params.set('Phone', phone); if (email) params.set('Mail', email)
    } else {
      params.set('total', String(grandTotal))
      if (firstName) params.set('firstname', firstName); if (lastName) params.set('lastname', lastName)
      if (phone) params.set('tel', phone); if (email) params.set('mail', email)
    }
    params.set('addactiondata', campaign.id); params.set('Param1', campaign.id)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const sp = new URLSearchParams()
    if (name) sp.set('dn', name); if (phone) sp.set('dp', phone); if (email) sp.set('de', email)
    params.set('successurl', `${origin}/${campaign.slug}/thanks${sp.toString() ? `?${sp}` : ''}`)
    const sep = m.url.includes('?') ? '&' : '?'
    setBankView(false); setPayUrl(`${m.url}${sep}${params.toString()}`); setStep('payment')
  }

  // "Pay" on the details step → method chooser (or straight through if there's one).
  function toPayment() {
    if (!valid) return
    if (methods.length > 1) { setStep('method'); return }
    if (methods.length === 1) { startMethod(methods[0]); return }
    setBankView(false); setPayUrl(''); setStep('payment')
  }

  const copy = (v: string) => { navigator.clipboard?.writeText(v).then(() => { setCopied(v); setTimeout(() => setCopied(c => c === v ? null : c), 1500) }).catch(() => {}) }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} dir={en ? 'ltr' : 'rtl'}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold">{step === 'details' ? (en ? 'Your details' : 'הפרטים שלך') : step === 'method' ? (en ? 'Payment method' : 'אמצעי תשלום') : (en ? 'Payment' : 'תשלום')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {step === 'details' && (
          <div className="overflow-y-auto px-5 py-4 space-y-3">
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
                {f.type === 'textarea'
                  ? <textarea value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                  : <input type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text'} value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" dir={f.type === 'tel' || f.type === 'email' ? 'ltr' : undefined} />}
              </div>
            ))}
            {/* order summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1 mt-2">
              {lines.map(l => (
                <div key={l.i} className="flex justify-between"><span>{l.p.name} ×{l.q}</span><span>{ils(lineTotal(l.p, l.q))}</span></div>
              ))}
              <div className="flex justify-between text-gray-500"><span>{en ? 'Shipping' : 'משלוח'}</span><span>{shipCost > 0 ? ils(shipCost) : (en ? 'Free' : 'חינם')}</span></div>
              <div className="flex justify-between font-black pt-1 border-t border-gray-200 mt-1"><span>{en ? 'Total' : 'סה״כ'}</span><span style={{ color: primary }}>{ils(grandTotal)}</span></div>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={toPayment} disabled={!valid} className="w-full rounded-xl py-3 text-white font-bold disabled:opacity-40" style={{ backgroundColor: primary }}>
              {en ? `Pay ${ils(grandTotal)}` : `לתשלום ${ils(grandTotal)}`}
            </button>
            {!valid && <p className="text-center text-[11px] text-gray-400 mt-1.5">{en ? 'Please fill the required fields' : 'נא למלא את שדות החובה'}</p>}
          </div>
        )}

        {/* Method chooser — routes to the matching clearing link */}
        {step === 'method' && (
          <div className="overflow-y-auto px-5 py-4 space-y-2">
            <p className="text-sm text-gray-500">{en ? 'Choose how to pay' : 'בחרו איך לשלם'} · <b style={{ color: primary }}>{ils(grandTotal)}</b></p>
            {methods.map(m => (
              <button key={m.key} onClick={() => startMethod(m)}
                className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 hover:border-current px-4 py-3 text-sm font-bold text-gray-700"
                style={{ color: primary }}>
                <span className="text-gray-800">{m.label}</span>
                <span aria-hidden>←</span>
              </button>
            ))}
            <button onClick={() => setStep('details')} className="text-xs text-gray-400 hover:text-gray-600 pt-1">{en ? 'Back' : 'חזרה לפרטים'}</button>
          </div>
        )}

        {step === 'payment' && bankView && bank && (
          <div className="overflow-y-auto px-5 py-4 space-y-3">
            <p className="font-bold text-gray-800">{en ? 'Bank transfer details' : 'פרטים להעברה בנקאית'} · <span style={{ color: primary }}>{ils(grandTotal)}</span></p>
            <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
              {([[en ? 'Account holder' : 'שם החשבון', bank.account_name], [en ? 'Bank' : 'בנק', bank.bank], [en ? 'Branch' : 'סניף', bank.branch], [en ? 'Account no.' : 'מספר חשבון', bank.account_number]] as [string, string | null | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="text-gray-400">{k}</span>
                  <span className="flex items-center gap-2 min-w-0"><span className="font-semibold text-gray-800 truncate" dir="ltr">{v}</span>
                    <button onClick={() => copy(String(v))} className="text-[11px] font-semibold shrink-0" style={{ color: primary }}>{copied === v ? (en ? '✓' : '✓ הועתק') : (en ? 'Copy' : 'העתק')}</button></span>
                </div>
              ))}
            </div>
            {bank.note && <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-xl px-3 py-2">{bank.note}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl py-3 text-white font-bold" style={{ backgroundColor: primary }}>{en ? 'Done' : 'סיימתי'}</button>
              <button onClick={() => setStep('method')} className="rounded-xl px-4 py-3 text-sm text-gray-500 border border-gray-200">{en ? 'Back' : 'חזרה'}</button>
            </div>
          </div>
        )}

        {step === 'payment' && !bankView && (
          payUrl ? (
            <div className="flex flex-col">
              {payMethod === 'bit' && (
                <div className="mx-4 mt-3 rounded-2xl px-4 py-3 text-center" style={{ backgroundColor: '#0A2E36', color: '#fff' }}>
                  <p className="text-base font-black">{en ? 'A payment link will be sent to you by SMS' : 'קישור לתשלום יישלח אליך ב-SMS'}</p>
                  <p className="mt-1 text-sm font-bold" style={{ color: '#37E5E0' }}>{en ? 'Open it and pay in the Bit app' : 'היכנסו לקישור והשלימו את התשלום באפליקציית ביט'}</p>
                  <p className="mt-1 text-xs" style={{ color: '#d7fbfa' }}>{en ? 'The order is recorded only after the Bit payment is completed ✓' : 'ההזמנה תיקלט רק לאחר השלמת התשלום בביט ✓'}</p>
                </div>
              )}
              <div className="w-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <iframe src={payUrl} className="w-full" style={{ height: 'min(680px, 74vh)', border: 'none' }} title={en ? 'Secure payment' : 'תשלום מאובטח'} allow="payment" />
              </div>
              <div className="px-5 pb-4 pt-3 space-y-2 border-t border-gray-100">
                <button
                  onClick={() => { if (typeof window !== 'undefined') window.location.href = `/${campaign.slug}/thanks` }}
                  className="w-full rounded-xl py-3 text-white font-bold"
                  style={{ backgroundColor: primary }}
                >
                  {en ? "I've completed the payment" : 'ביצעתי את התשלום — המשך'}
                </button>
                <p className="text-center text-[11px] text-gray-400">{en ? 'After payment the order is confirmed automatically.' : 'לאחר השלמת התשלום ההזמנה נקלטת אוטומטית. לחצו כאן לאחר התשלום.'}</p>
                <button onClick={() => setStep('method')} className="block mx-auto text-xs text-gray-400 hover:text-gray-600">{en ? 'Back' : 'חזרה'}</button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-10 text-center space-y-3">
              <p className="font-bold text-gray-700">{en ? 'Payment not configured' : 'דף הסליקה לא הוגדר'}</p>
              <p className="text-sm text-gray-400">{en ? 'Please contact us.' : 'נא לפנות אלינו להשלמת ההזמנה.'}</p>
              <button onClick={() => setStep('details')} className="text-sm text-blue-500 hover:underline">{en ? 'Back' : 'חזרה'}</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
