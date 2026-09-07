import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recomputeCampaignRaised } from '@/lib/donations'

export const runtime = 'nodejs'

// Manager-entered order for a product-sales campaign: a sale that was paid some
// other way (cash / Bit / bank transfer / cheque) and typed in by hand. Recorded
// as a donation row exactly like a checkout order so it shows in the orders table.

interface QtyTier { qty: number; price: number }
interface Product { name: string; price: number; sale_price?: number | null; qty_tiers?: QtyTier[] }
interface Shipping { cost?: number; free_over?: number | null }

// Greedy bundle pricing — mirrors ProductSalesClient.lineTotal (qty_tiers are
// "buy `qty` units for total `price`"). Server is the source of truth for money.
function lineTotal(p: Product, q: number): number {
  const unit = p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price
  const tiers = [...(p.qty_tiers || [])].filter(t => t.qty > 1 && t.price > 0).sort((a, b) => b.qty - a.qty)
  let remaining = q, total = 0
  for (const t of tiers) {
    if (remaining >= t.qty) { const b = Math.floor(remaining / t.qty); total += b * t.price; remaining -= b * t.qty }
  }
  return total + remaining * unit
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'מזומן', bit: 'ביט / פייבוקס', transfer: 'העברה בנקאית', other: 'אחר / צ׳ק',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params
  const supabase = await createClient()

  // auth: only a member of the campaign's org (or super admin) may record orders.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single()
  const { data: campaign } = await supabase.from('campaigns').select('id, org_id, settings').eq('id', campaignId).single()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })
  const isSuper = profile?.role === 'super_admin'
  if (!isSuper && profile?.org_id !== campaign.org_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const settings = (campaign.settings || {}) as { products?: Product[]; shipping?: Shipping }
  const products = Array.isArray(settings.products) ? settings.products : []
  const shipping = settings.shipping || {}

  // quantities: { [productIndex]: qty }. Compute subtotal from the stored catalog.
  const quantities = (body.quantities || {}) as Record<string, number>
  const lines: { name: string; qty: number }[] = []
  let subtotal = 0
  for (const [idx, rawQ] of Object.entries(quantities)) {
    const q = Math.max(0, Math.floor(Number(rawQ) || 0))
    const p = products[Number(idx)]
    if (!p || q <= 0) continue
    subtotal += lineTotal(p, q)
    lines.push({ name: p.name, qty: q })
  }

  // free_over waives shipping; otherwise flat shipping.cost (only when there's a subtotal).
  const shipCost = subtotal <= 0 ? 0
    : (shipping.free_over != null && shipping.free_over > 0 && subtotal >= shipping.free_over) ? 0
    : Number(shipping.cost) || 0
  // Manager may override the grand total (custom price / discount); else computed.
  const override = body.amount_override != null && body.amount_override !== '' ? Number(body.amount_override) : null
  const grandTotal = override != null && override >= 0 ? override : subtotal + shipCost

  if (lines.length === 0 && grandTotal <= 0) {
    return NextResponse.json({ error: 'הזמנה ריקה — בחר מוצרים או הזן סכום' }, { status: 400 })
  }

  const method = String(body.payment_method || 'cash')
  const methodLabel = METHOD_LABEL[method] || 'אחר'
  const paid = body.paid !== false // default: paid

  const fields = (body.fields || {}) as Record<string, string>
  const ils = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL')

  // custom_data mirrors the checkout order shape so OrdersClient renders it the same.
  const custom_data: Record<string, string | boolean> = {
    'הזמנה': lines.map(l => `${l.name} ×${l.qty}`).join(', ') || (body.order_note ? String(body.order_note) : 'הזמנה ידנית'),
    'משלוח': shipCost > 0 ? ils(shipCost) : 'חינם',
    'סכום פריטים': ils(subtotal),
    'אמצעי תשלום': methodLabel,
    payment_method: method,
    __manual: true,
  }
  // buyer-entered fields (address etc.) → shown as label:value in the order card.
  for (const [k, v] of Object.entries(fields)) {
    if (['full_name', 'phone', 'email'].includes(k)) continue
    if (v && String(v).trim()) custom_data[k] = String(v).trim()
  }
  if (body.note && String(body.note).trim()) custom_data.fulfillment_note = String(body.note).trim()

  const { data: inserted, error } = await supabase.from('donations').insert({
    campaign_id: campaignId,
    org_id: campaign.org_id,
    amount: grandTotal,
    currency: 'ILS',
    donor_name: fields.full_name?.trim() || fields['שם מלא']?.trim() || null,
    donor_phone: fields.phone?.trim() || fields['טלפון']?.trim() || null,
    donor_email: fields.email?.trim() || fields['אימייל']?.trim() || null,
    payment_status: paid ? 'completed' : 'pending',
    payment_type: 'one_time',
    custom_data,
  }).select('id, amount, donor_name, donor_phone, donor_email, payment_status, created_at, custom_data, kesher_transaction_id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count paid manual orders toward the campaign total (like any completed order).
  if (paid) await recomputeCampaignRaised(supabase, campaignId)

  return NextResponse.json({ order: inserted })
}
