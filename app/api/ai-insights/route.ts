import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const { type, data } = await request.json()
    const supabase = await createServiceClient()

  if (type === 'daily_summary') {
        const { org_id } = data
        const today = new Date().toISOString().split('T')[0]

      const [{ data: campaigns }, { data: donations }, { data: callers }] = await Promise.all([
              supabase.from('campaigns').select('id, title, goal_amount, raised_amount, status').eq('org_id', org_id).eq('status', 'active'),
              supabase.from('donations').select('amount, donor_name, created_at, caller_id').eq('org_id', org_id).eq('payment_status', 'completed').gte('created_at', today),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              supabase.from('callers').select('total_donated, total_called, profiles(full_name)').eq('org_id', org_id).order('total_donated', { ascending: false }).limit(5) as any,
            ])

      const totalToday = donations?.reduce((s: number, d: { amount: number }) => s + (d.amount || 0), 0) || 0
        const campaign = campaigns?.[0]
        const pct = campaign ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) : 0

      return NextResponse.json({
              summary: `היום גויסו ₪${totalToday.toLocaleString()} ב-${donations?.length || 0} תרומות. הקמפיין הפעיל עומד על ${pct}% מהיעד.`,
              recommendations: [
                        'המשיכו לעודד את הטלפנים המובילים',
                        'בדקו את שעות השיא ותכננו שיחות בהתאם',
                        'עדכנו את התורמים הקבועים על ההתקדמות',
                      ],
              stats: { totalToday, donationsCount: donations?.length || 0, pct, campaign },
      })
  }

  if (type === 'set_goal') {
        const { campaign_name, current_raised, goal_amount, callers_count, target_today } = data

      return NextResponse.json({
              strategy: `כדי להגיע ליעד היומי של ₪${target_today?.toLocaleString()} בקמפיין "${campaign_name}", יש לנצל את ${callers_count} הטלפנים באופן מיטבי. גויס עד כה ₪${current_raised?.toLocaleString()} מתוך ₪${goal_amount?.toLocaleString()}.`,
              tasks: [
                        'חלקו את היעד היומי בין הטלפנים באופן שווה',
                        'עדכנו את הטלפנים על ההתקדמות בזמן אמת',
                        'פנו לרשימת תורמים חוזרים בעדיפות ראשונה',
                        'עודדו תרומות גדולות יותר בשעות הבוקר',
                      ],
              expected_calls: callers_count ? callers_count * 20 : 100,
      })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
