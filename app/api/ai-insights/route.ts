import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createServiceClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { type, data } = await request.json()
  const supabase = await createServiceClient()

  if (type === 'daily_summary') {
    const { org_id } = data
    const today = new Date().toISOString().split('T')[0]

    const [{ data: campaigns }, { data: donations }, { data: callers }] = await Promise.all([
      supabase.from('campaigns').select('id, title, goal_amount, raised_amount, status').eq('org_id', org_id).eq('status', 'active'),
      supabase.from('donations').select('amount, donor_name, created_at, caller_id').eq('org_id', org_id).eq('payment_status', 'completed').gte('created_at', today),
      supabase.from('callers').select('total_donated, total_called, profiles(full_name)').eq('org_id', org_id).order('total_donated', { ascending: false }).limit(5),
    ])

    const totalToday = donations?.reduce((s, d) => s + (d.amount || 0), 0) || 0
    const campaign = campaigns?.[0]
    const pct = campaign ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) : 0

    const prompt = `נתוני יום גיוס של ארגון:
קמפיין פעיל: ${campaign?.title || 'אין'}
יעד: ₪${campaign?.goal_amount?.toLocaleString() || 0}
גויס עד כה: ₪${campaign?.raised_amount?.toLocaleString() || 0} (${pct}%)
תרומות היום: ${donations?.length || 0} תרומות על סך ₪${totalToday.toLocaleString()}
טלפנים מובילים: ${callers?.map((c: { profiles: unknown; total_donated: unknown }) => { const p = c.profiles as { full_name?: string } | null; const name = Array.isArray(p) ? (p[0] as { full_name?: string })?.full_name : p?.full_name; return `${name || 'טלפן'}: ₪${Number(c.total_donated || 0).toLocaleString()}` }).join(', ')}

ספק:
1. סיכום קצר של היום (2-3 משפטים)
2. 3 המלצות קונקרטיות לשיפור הביצועים

ענה בעברית, בצורה מקצועית וישירה. פורמט: JSON עם שדות: summary (string), recommendations (array of 3 strings)`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'אתה יועץ גיוס כספים מקצועי. ענה תמיד ב-JSON תקין בלבד.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)

    return NextResponse.json({
      summary: parsed.summary || '',
      recommendations: parsed.recommendations || [],
      stats: { totalToday, donationsCount: donations?.length || 0, pct, campaign },
    })
  }

  if (type === 'set_goal') {
    const { campaign_name, current_raised, goal_amount, callers_count, target_today } = data

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'אתה יועץ גיוס כספים. ענה ב-JSON תקין בלבד.' },
        {
          role: 'user',
          content: `קמפיין: ${campaign_name}
גויס עד כה: ₪${current_raised?.toLocaleString()}
יעד כולל: ₪${goal_amount?.toLocaleString()}
מספר טלפנים: ${callers_count}
יעד היום: ₪${target_today?.toLocaleString()}

ספק אסטרטגיה מפורטת להשגת היעד היומי.
JSON עם שדות: strategy (string, 3-4 משפטים), tasks (array of 4 strings - משימות קונקרטיות), expected_calls (number)`
        },
      ],
      max_tokens: 512,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')
    return NextResponse.json(parsed)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
