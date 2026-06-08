import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getKesherCredentials, getLinkToken } from '@/lib/kesher/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      campaignId,
      amountShekels,
      paymentType = 'one_time',
      numPayments,
      donorName,
      donorEmail,
      donorPhone,
      dedication,
    }: {
      campaignId: string
      amountShekels: number
      paymentType?: 'one_time' | 'recurring'
      numPayments?: number
      donorName?: string
      donorEmail?: string
      donorPhone?: string
      dedication?: string
    } = body

    if (!campaignId || !amountShekels) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const amountAgorot = Math.round(amountShekels * 100)
    const supabase = await createClient()

    // 1. Get org_id from campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('org_id, title')
      .eq('id', campaignId)
      .single()

    if (!campaign) return NextResponse.json({ error: 'קמפיין לא נמצא' }, { status: 404 })

    // 2. Get Kesher credentials
    const credentials = await getKesherCredentials(campaignId)
    if (!credentials) {
      return NextResponse.json({ error: 'פרטי סליקה לא מוגדרים' }, { status: 400 })
    }

    // 3. Create uniq_num for idempotency
    const uniqNum = `kafool_${campaignId}_${Date.now()}`

    // 4. Split donor name
    const nameParts = (donorName || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // 5. Insert donation as pending
    const { data: donation, error: insertError } = await supabase
      .from('donations')
      .insert({
        campaign_id: campaignId,
        org_id: campaign.org_id,
        amount: amountShekels,
        amount_agorot: amountAgorot,
        currency: 'ILS',
        payment_type: paymentType,
        num_payments: numPayments || 1,
        donor_name: donorName || null,
        donor_email: donorEmail || null,
        donor_phone: donorPhone || null,
        dedication: dedication || null,
        payment_status: 'pending',
        status: 'pending',
        uniq_num: uniqNum,
      })
      .select('id')
      .single()

    if (insertError || !donation) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'שגיאה ביצירת עסקה' }, { status: 500 })
    }

    // 6. Get link token from Kesher
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://kafool.com'

    const { iframeUrl } = await getLinkToken(credentials, {
      amountAgorot,
      donorFirstName: firstName || undefined,
      donorLastName: lastName || undefined,
      donorEmail: donorEmail || undefined,
      donorPhone: donorPhone || undefined,
      paymentType,
      numPayments: numPayments || 1,
      donationId: donation.id,
      successUrl: `${BASE_URL}/payment/success`,
      failedUrl: `${BASE_URL}/payment/failed`,
    })

    return NextResponse.json({ iframeUrl, donationId: donation.id })
  } catch (err) {
    console.error('Payment init error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}
