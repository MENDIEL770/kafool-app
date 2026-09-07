import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgCardcom } from '@/lib/cardcom/org'
import { createLowProfile } from '@/lib/cardcom/client'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kafool.com'

// Create a CardCom hosted payment page (LowProfile) for a ₪ donation/order and
// return its URL to load in an iframe. The webhook + verify endpoint (GetLpResult)
// are the source of truth for recording.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const b = await req.json().catch(() => ({}))
  const campaignId = String(b.campaignId || '')
  const amount = Math.round(Number(b.amount) || 0)
  if (!campaignId || amount <= 0) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const { data: campaign } = await supabase
    .from('campaigns').select('org_id, slug, title').eq('id', campaignId).maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })

  const creds = await getOrgCardcom(supabase, (campaign as { org_id: string }).org_id)
  if (!creds) return NextResponse.json({ error: 'CardCom לא מוגדר לארגון' }, { status: 400 })

  const slug = (campaign as { slug: string }).slug
  const groupSlug = String(b.groupSlug || '').trim()
  const months = Math.max(0, Math.min(36, Number(b.months) || 0))
  // ReturnValue is echoed back in the webhook + GetLpResult — carry campaign + group.
  const returnValue = `${campaignId}|${groupSlug}`
  const key = process.env.WEBHOOK_SECRET
  const webHookUrl = `${BASE}/api/webhooks/cardcom${key ? `?key=${encodeURIComponent(key)}` : ''}`

  try {
    const r = await createLowProfile(creds, {
      operation: 'ChargeOnly',
      amount,
      coinId: 1,
      language: b.lang === 'en' ? 'en' : 'he',
      productName: (campaign as { title?: string }).title || 'תרומה',
      returnValue,
      successRedirectUrl: `${BASE}/${slug}/thanks`,
      failedRedirectUrl: `${BASE}/${slug}`,
      webHookUrl,
      name: String(b.name || '').trim() || undefined,
      email: String(b.email || '').trim() || undefined,
      phone: String(b.phone || '').trim() || undefined,
      maxPayments: months > 1 ? months : undefined,
    })
    if (r.ResponseCode !== 0 || !r.Url) {
      return NextResponse.json({ error: r.Description || 'CardCom error' }, { status: 502 })
    }
    return NextResponse.json({ url: r.Url, lowProfileId: r.LowProfileId, urlToBit: r.UrlToBit || null })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
