'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/image-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Trash2, ChevronUp, ChevronDown, Plus, Check, X } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface QtyTier { qty: number; price: number }        // `qty` units cost `price` total
interface Product {
  _cid: string
  name: string
  description: string
  images: string[]
  video_url: string
  price: number
  sale_price: number | null    // when set, `price` is the struck-through "before" price
  qty_tiers: QtyTier[]
  max_qty: number | null
}
type FieldType = 'text' | 'tel' | 'email' | 'textarea'
interface CheckoutField { _cid: string; key: string; label: string; type: FieldType; required: boolean; enabled: boolean }

const cid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()))

// Physical-product checkout field library. Manager toggles/reorders/edits these
// and may add custom fields on top.
const DEFAULT_FIELDS: Omit<CheckoutField, '_cid'>[] = [
  { key: 'full_name', label: 'שם מלא', type: 'text', required: true, enabled: true },
  { key: 'phone', label: 'טלפון', type: 'tel', required: true, enabled: true },
  { key: 'email', label: 'אימייל', type: 'email', required: false, enabled: true },
  { key: 'city', label: 'עיר', type: 'text', required: true, enabled: true },
  { key: 'street', label: 'רחוב', type: 'text', required: true, enabled: true },
  { key: 'house_number', label: 'מספר בית', type: 'text', required: true, enabled: true },
  { key: 'zip', label: 'מיקוד', type: 'text', required: false, enabled: false },
  { key: 'notes', label: 'הערות למשלוח', type: 'textarea', required: false, enabled: false },
]

export default function ProductsEditorPage() {
  const { id: campaignId } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [isProducts, setIsProducts] = useState(true)

  const [products, setProducts] = useState<Product[]>([])
  const [shipCost, setShipCost] = useState('')
  const [freeOver, setFreeOver] = useState('')
  const [fields, setFields] = useState<CheckoutField[]>([])
  const [uploading, setUploading] = useState<string | null>(null)   // `${cid}` of product uploading

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('title, settings').eq('id', campaignId).single()
      if (data) {
        setCampaignName(data.title || '')
        const s = (data.settings || {}) as Record<string, unknown>
        setIsProducts(s.page_type === 'products')
        const rawProducts = Array.isArray(s.products) ? (s.products as Partial<Product>[]) : []
        setProducts(rawProducts.map(p => ({
          _cid: cid(), name: p.name || '', description: p.description || '',
          images: Array.isArray(p.images) ? p.images.filter(Boolean) as string[] : [],
          video_url: p.video_url || '', price: Number(p.price) || 0,
          sale_price: p.sale_price != null && Number(p.sale_price) > 0 ? Number(p.sale_price) : null,
          qty_tiers: Array.isArray(p.qty_tiers) ? p.qty_tiers.map(t => ({ qty: Number(t.qty) || 0, price: Number(t.price) || 0 })) : [],
          max_qty: p.max_qty != null && Number(p.max_qty) > 0 ? Number(p.max_qty) : null,
        })))
        const sh = (s.shipping || {}) as { cost?: number; free_over?: number | null }
        setShipCost(sh.cost != null ? String(sh.cost) : '')
        setFreeOver(sh.free_over != null ? String(sh.free_over) : '')
        const rawFields = Array.isArray(s.checkout_fields) ? (s.checkout_fields as Partial<CheckoutField>[]) : null
        setFields((rawFields && rawFields.length ? rawFields.map(f => ({
          _cid: cid(), key: f.key || cid(), label: f.label || '', type: (f.type as FieldType) || 'text',
          required: !!f.required, enabled: f.enabled !== false,
        })) : DEFAULT_FIELDS.map(f => ({ ...f, _cid: cid() }))))
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  // ── product ops ──
  const upP = (i: number, patch: Partial<Product>) => setProducts(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const addP = () => setProducts(ps => [...ps, { _cid: cid(), name: '', description: '', images: [], video_url: '', price: 0, sale_price: null, qty_tiers: [], max_qty: null }])
  const rmP = (i: number) => setProducts(ps => ps.filter((_, idx) => idx !== i))
  const moveP = (i: number, d: -1 | 1) => setProducts(ps => { const j = i + d; if (j < 0 || j >= ps.length) return ps; const n = [...ps]; [n[i], n[j]] = [n[j], n[i]]; return n })
  async function addImages(i: number, files: FileList) {
    const p = products[i]; setUploading(p._cid)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) urls.push(await uploadImage(f, `campaigns/${campaignId}/product-${p._cid}-${Date.now()}-${urls.length}`))
      upP(i, { images: [...p.images, ...urls] })
    } catch { alert('העלאת התמונה נכשלה') }
    setUploading(null)
  }
  const rmImage = (i: number, k: number) => setProducts(ps => ps.map((p, idx) => idx === i ? { ...p, images: p.images.filter((_, x) => x !== k) } : p))
  const addTier = (i: number) => upP(i, { qty_tiers: [...products[i].qty_tiers, { qty: 0, price: 0 }] })
  const upTier = (i: number, ti: number, patch: Partial<QtyTier>) => upP(i, { qty_tiers: products[i].qty_tiers.map((t, idx) => idx === ti ? { ...t, ...patch } : t) })
  const rmTier = (i: number, ti: number) => upP(i, { qty_tiers: products[i].qty_tiers.filter((_, idx) => idx !== ti) })

  // ── field ops ──
  const upF = (i: number, patch: Partial<CheckoutField>) => setFields(fs => fs.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  const addF = () => setFields(fs => [...fs, { _cid: cid(), key: `custom_${cid().slice(0, 6)}`, label: 'שדה חדש', type: 'text', required: false, enabled: true }])
  const rmF = (i: number) => setFields(fs => fs.filter((_, idx) => idx !== i))
  const moveF = (i: number, d: -1 | 1) => setFields(fs => { const j = i + d; if (j < 0 || j >= fs.length) return fs; const n = [...fs]; [n[i], n[j]] = [n[j], n[i]]; return n })

  async function save() {
    setSaving(true)
    const { data: cur } = await supabase.from('campaigns').select('settings').eq('id', campaignId).single()
    const cleanProducts = products
      .filter(p => p.name.trim() && p.price > 0)
      .map(p => ({
        name: p.name.trim(), description: p.description.trim() || null,
        images: p.images, video_url: p.video_url.trim() || null,
        price: p.price,
        sale_price: p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price ? p.sale_price : null,
        qty_tiers: p.qty_tiers.filter(t => t.qty > 1 && t.price > 0).sort((a, b) => a.qty - b.qty),
        max_qty: p.max_qty && p.max_qty > 0 ? p.max_qty : null,
      }))
    const checkout_fields = fields
      .filter(f => f.label.trim())
      .map(f => ({ key: f.key, label: f.label.trim(), type: f.type, required: f.required, enabled: f.enabled }))
    const settings = {
      ...(cur?.settings as object || {}),
      products: cleanProducts,
      shipping: { cost: Number(shipCost) || 0, free_over: freeOver.trim() ? Number(freeOver) || null : null },
      checkout_fields,
    }
    const { error } = await supabase.from('campaigns').update({ settings }).eq('id', campaignId)
    if (error) { alert('השמירה נכשלה: ' + error.message); setSaving(false); return }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400" dir="rtl">טוען…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">מוצרים ומכירה — {campaignName}</h1>
        <p className="text-sm text-gray-500 mt-1">המוצרים, המבצעים, עלות המשלוח והפרטים שייאספו מהקונה בקופה.</p>
      </div>

      {!isProducts && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          הקמפיין הזה מוגדר כדף קמפיין רגיל (לא דף מכירות). אפשר להגדיר כאן מוצרים, אבל הם יוצגו רק בדף מכירות מוצרים.
        </div>
      )}

      {/* ── Products ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">המוצרים</h2>
          <button onClick={addP} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"><Plus className="w-4 h-4" /> הוסף מוצר</button>
        </div>

        {products.map((p, i) => (
          <Card key={p._cid}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1 text-gray-300">
                  <button onClick={() => moveP(i, -1)} disabled={i === 0} className="hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveP(i, 1)} disabled={i === products.length - 1} className="hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">שם המוצר</Label>
                    <Input value={p.name} onChange={e => upP(i, { name: e.target.value })} placeholder="לדוגמה — סט נרות" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">תיאור / הסבר על המוצר</Label>
                    <Textarea value={p.description} onChange={e => upP(i, { description: e.target.value })} rows={2} placeholder="פרטים על המוצר…" />
                  </div>

                  {/* images */}
                  <div className="space-y-1">
                    <Label className="text-xs">תמונות (הראשונה היא הראשית)</Label>
                    <div className="flex flex-wrap gap-2">
                      {p.images.map((url, k) => (
                        <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => rmImage(i, k)} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-red-600/90 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                          {k === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center">ראשית</span>}
                        </div>
                      ))}
                      <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center cursor-pointer bg-gray-50 ${uploading === p._cid ? 'opacity-60 pointer-events-none' : ''}`}>
                        {uploading === p._cid ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-gray-300" />}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) addImages(i, e.target.files); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">קישור לסרטון (אופציונלי)</Label>
                    <Input value={p.video_url} onChange={e => upP(i, { video_url: e.target.value })} dir="ltr" placeholder="https://youtube.com/…" />
                  </div>

                  {/* price + sale */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">מחיר (₪)</Label>
                      <Input type="number" value={p.price || ''} onChange={e => upP(i, { price: Number(e.target.value) || 0 })} dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">מחיר מבצע (₪)</Label>
                      <Input type="number" value={p.sale_price ?? ''} onChange={e => upP(i, { sale_price: e.target.value ? Number(e.target.value) : null })} dir="ltr" placeholder="ריק = אין" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">מקסימום לכמות</Label>
                      <Input type="number" value={p.max_qty ?? ''} onChange={e => upP(i, { max_qty: e.target.value ? Number(e.target.value) : null })} dir="ltr" placeholder="ללא הגבלה" />
                    </div>
                  </div>

                  {/* quantity deals */}
                  <div className="space-y-1.5 rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">מבצעי כמות (X יחידות ב-Y ₪)</Label>
                      <button onClick={() => addTier(i)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ הוסף מדרגה</button>
                    </div>
                    {p.qty_tiers.map((t, ti) => (
                      <div key={ti} className="flex items-center gap-2">
                        <Input type="number" value={t.qty || ''} onChange={e => upTier(i, ti, { qty: Number(e.target.value) || 0 })} dir="ltr" className="w-20" placeholder="כמות" />
                        <span className="text-xs text-gray-400">ב־</span>
                        <Input type="number" value={t.price || ''} onChange={e => upTier(i, ti, { price: Number(e.target.value) || 0 })} dir="ltr" className="w-24" placeholder="₪ סה״כ" />
                        <span className="text-xs text-gray-400">₪</span>
                        <button onClick={() => rmTier(i, ti)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    {p.qty_tiers.length === 0 && <p className="text-[11px] text-gray-400">ללא — מחיר לפי כמות רגיל.</p>}
                  </div>
                </div>
                <button onClick={() => rmP(i)} title="מחק מוצר" className="text-red-400 hover:text-red-600 pt-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <p className="text-sm text-gray-400">אין מוצרים עדיין. לחץ "הוסף מוצר".</p>}
      </div>

      {/* ── Shipping ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">משלוח</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>עלות משלוח (₪)</Label>
              <Input type="number" value={shipCost} onChange={e => setShipCost(e.target.value)} dir="ltr" placeholder="0 = חינם" />
            </div>
            <div className="space-y-1">
              <Label>משלוח חינם מעל (₪)</Label>
              <Input type="number" value={freeOver} onChange={e => setFreeOver(e.target.value)} dir="ltr" placeholder="ריק = תמיד בתשלום" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">משלוח קבוע לכל הזמנה. אם מוגדר סף חינם — הזמנות מעליו יקבלו משלוח חינם.</p>
        </CardContent>
      </Card>

      {/* ── Checkout fields ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">פרטים לאיסוף בקופה</CardTitle>
          <p className="text-xs text-gray-400 mt-1">בחר אילו שדות יופיעו לקונה, שנה שם/חובה, סדר את הסדר, והוסף שדות משלך. הפרטים נשמרים להזמנה ולא מוצגים בדף הציבורי.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((f, i) => (
            <div key={f._cid} className={`flex items-center gap-2 rounded-lg border p-2 ${f.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
              <div className="flex flex-col text-gray-300">
                <button onClick={() => moveF(i, -1)} disabled={i === 0} className="hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveF(i, 1)} disabled={i === fields.length - 1} className="hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
              <input type="checkbox" checked={f.enabled} onChange={e => upF(i, { enabled: e.target.checked })} className="w-4 h-4 accent-blue-600" title="הצג שדה" />
              <Input value={f.label} onChange={e => upF(i, { label: e.target.value })} className="flex-1" placeholder="שם השדה" />
              <select value={f.type} onChange={e => upF(i, { type: e.target.value as FieldType })} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs">
                <option value="text">טקסט</option>
                <option value="tel">טלפון</option>
                <option value="email">אימייל</option>
                <option value="textarea">טקסט ארוך</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                <input type="checkbox" checked={f.required} onChange={e => upF(i, { required: e.target.checked })} className="w-3.5 h-3.5 accent-blue-600" /> חובה
              </label>
              <button onClick={() => rmF(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={addF} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 pt-1"><Plus className="w-4 h-4" /> הוסף שדה</button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur py-3">
        <Button onClick={save} disabled={saving || !!uploading} className="w-full">
          {saved ? <><Check className="w-4 h-4" /> נשמר!</> : saving ? 'שומר…' : uploading ? 'מעלה תמונה…' : 'שמור'}
        </Button>
      </div>
    </div>
  )
}
