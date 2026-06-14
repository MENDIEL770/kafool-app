import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendYemotSms } from '@/lib/sms/yemot'

/**
 * Sends the campaign donation link to a lead by SMS (called from the caller
 * screen) and records it in link_sends. Body: { leadId, callerId }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId, callerId } = await req.json()
  if (!leadId) return NextResponse.json({ error: 'חסר leadId' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: lead } = await admin
    .from('leads')
    .select('id, phone, org_id, campaign_id')
    .eq('id', leadId)
    .single()
  if (!lead?.phone) return NextResponse.json({ error: 'אין מספר טלפון לליד' }, { status: 400 })

  const { data: campaign } = await admin
    .from('campaigns')
    .select('slug, title')
    .eq('id', lead.campaign_id)
    .single()

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'
  const url = `${base}/${campaign?.slug ?? ''}`

  const apiKey = process.env.YEMOT_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'YEMOT_API_KEY לא מוגדר' }, { status: 400 })

  const sms = await sendYemotSms(
    apiKey,
    lead.phone,
    `שלום, לתרומה לקמפיין "${campaign?.title ?? ''}": ${url}`
  )

  await admin.from('link_sends').insert({
    org_id: lead.org_id,
    campaign_id: lead.campaign_id,
    lead_id: lead.id,
    caller_id: callerId ?? null,
    channel: 'sms',
  })

  if (!sms.success) return NextResponse.json({ error: sms.error || 'שליחת SMS נכשלה' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
