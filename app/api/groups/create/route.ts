import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendYemotSms } from '@/lib/sms/yemot'

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[֐-׿]/g, '') // strip Hebrew
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
    .select('id, org_id, slug, group_welcome_sms')
    .eq('id', campaignId)
    .eq('status', 'active')
    .single()

  if (!campaign) return NextResponse.json({ error: 'קמפיין לא נמצא' }, { status: 404 })

  const { data: org } = await adminClient
    .from('organizations')
    .select('slug')
    .eq('id', campaign.org_id)
    .single()

  async function slugTaken(s: string) {
    const { data } = await adminClient
      .from('groups').select('id').eq('campaign_id', campaignId).eq('slug', s).maybeSingle()
    return !!data
  }

  // Build a clean unique slug:
  //  - if the name has latin chars → use it (with -2, -3 on collision)
  //  - otherwise (Hebrew name) → a short running number (1, 2, 3 ...)
  let slug = toSlug(name)
  if (slug) {
    const base = slug
    let attempt = 1
    while (await slugTaken(slug)) { attempt++; slug = `${base}-${attempt}` }
  } else {
    const { count } = await adminClient
      .from('groups').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)
    let n = (count || 0) + 1
    while (await slugTaken(String(n))) n++
    slug = String(n)
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

  // Send SMS to manager — use the campaign's custom template if set,
  // otherwise a built-in default. Placeholders: {שם} (manager name), {קישור} (group link).
  const groupUrl = `https://kafool.com/${campaign.slug}/g/${slug}`
  const apiKey = process.env.YEMOT_API_KEY
  if (apiKey && managerPhone) {
    const template = campaign.group_welcome_sms?.trim()
      || `שלום {שם}!\nנפתחה קבוצת גיוס עבורך.\nהקישור שלך:\n{קישור}`
    const msg = template
      .replaceAll('{שם}', managerName || name)
      .replaceAll('{קישור}', groupUrl)
    await sendYemotSms(apiKey, managerPhone, msg)
  }

  return NextResponse.json({ ok: true, group, groupUrl })
}
