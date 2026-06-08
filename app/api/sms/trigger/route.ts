import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendYemotSms } from '@/lib/sms/yemot'
import { renderTemplate } from '@/lib/sms/sender'

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, donor_name, donor_phone, amount, dedication } = await req.json()
    if (!campaign_id) return NextResponse.json({ ok: false, error: 'missing campaign_id' })

    const supabase = await createServiceClient()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('org_id, title')
      .eq('id', campaign_id)
      .single()

    if (!campaign) return NextResponse.json({ ok: false, error: 'campaign not found' })

    // חוקי אוטומציה פעילים לקמפיין זה
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('trigger_event', 'donation_completed')
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no active rules' })
    }

    const apiKey = process.env.YEMOT_API_KEY
    if (!apiKey) return NextResponse.json({ ok: false, error: 'YEMOT_API_KEY not configured' })

    const vars = {
      donor_name: donor_name || 'תורם',
      amount: String(amount || 0),
      campaign_title: campaign.title || '',
      dedication: dedication || '',
    }

    let sent = 0

    for (const rule of rules) {
      // שלח לתורם אם יש טלפון
      const phone = donor_phone
      if (!phone) continue

      const message = renderTemplate(rule.template || '', vars)

      const result = await sendYemotSms(apiKey, phone, message)

      await supabase.from('sms_logs').insert({
        org_id: campaign.org_id,
        campaign_id,
        to_phone: phone,
        message,
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
      })

      if (result.success) sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('SMS trigger error:', err)
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
