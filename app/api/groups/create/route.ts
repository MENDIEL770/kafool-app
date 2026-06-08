import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendYemotSms } from '@/lib/sms/yemot'

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[֐-׿]/g, '') // strip Hebrew
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || `group-${Date.now()}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campaignId, name, managerName, managerPhone, goalAmount, imageUrl } = body

  if (!campaignId || !name || !managerPhone) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get campaign + org
  const { data: campaign } = await adminClient
    .from('campaigns')
    .select('id, org_id, slug')
    .eq('id', campaignId)
    .eq('status', 'active')
    .single()

  if (!campaign) return NextResponse.json({ error: 'קמפיין לא נמצא' }, { status: 404 })

  const { data: org } = await adminClient
    .from('organizations')
    .select('slug')
    .eq('id', campaign.org_id)
    .single()

  // Build unique slug
  let baseSlug = toSlug(name) || `group-${Date.now()}`
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: exists } = await adminClient
      .from('groups')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('slug', slug)
      .single()
    if (!exists) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { data: group, error } = await adminClient.from('groups').insert({
    campaign_id: campaignId,
    org_id: campaign.org_id,
    name,
    slug,
    goal_amount: Number(goalAmount) || 0,
    manager_name: managerName || null,
    manager_phone: managerPhone,
    image_url: imageUrl || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send SMS to manager
  const groupUrl = `https://kafool.com/${campaign.slug}/g/${slug}`
  const apiKey = process.env.YEMOT_API_KEY
  if (apiKey && managerPhone) {
    const msg = `שלום ${managerName || name}!\nנפתחה קבוצת גיוס עבורך.\nהקישור שלך:\n${groupUrl}`
    await sendYemotSms(apiKey, managerPhone, msg)
  }

  return NextResponse.json({ ok: true, group, groupUrl })
}
