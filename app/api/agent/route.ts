import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const MODEL = 'llama-3.3-70b-versatile'

// ─── Tool definitions (OpenAI format — Groq compatible) ───────────────────────

const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_organizations',
      description: 'מביא רשימת ארגונים. ניתן לסנן לפי סטטוס. מחזיר שם, slug, סטטוס, תאריך יצירה.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'active', 'suspended', 'all'],
            description: 'סנן לפי סטטוס. all = כל הארגונים',
          },
          limit: { type: 'number', description: 'כמות תוצאות (ברירת מחדל 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaigns',
      description: 'מביא קמפיינים. ניתן לסנן לפי org_id או סטטוס.',
      parameters: {
        type: 'object',
        properties: {
          org_id: { type: 'string', description: 'UUID של ארגון ספציפי' },
          status: { type: 'string', enum: ['draft', 'active', 'ended', 'all'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_donations',
      description: 'מביא תרומות. ניתן לסנן לפי campaign_id, org_id, payment_status, או תאריך.',
      parameters: {
        type: 'object',
        properties: {
          org_id: { type: 'string' },
          campaign_id: { type: 'string' },
          payment_status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed', 'refunded', 'all'],
          },
          days_back: { type: 'number', description: 'כמה ימים אחורה (ברירת מחדל 7)' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_webhook_logs',
      description: 'מביא לוגים של webhooks מקשר. מזהה עסקאות שנכשלו או לא עובדו.',
      parameters: {
        type: 'object',
        properties: {
          processed: { type: 'boolean', description: 'true=עובדו, false=לא עובדו' },
          signature_valid: { type: 'boolean' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sms_logs',
      description: 'מביא לוגים של SMS שנשלחו. מזהה כשלים.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['queued', 'sent', 'delivered', 'failed', 'all'] },
          org_id: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_system_stats',
      description: 'סטטיסטיקות כלליות: ארגונים, קמפיינים פעילים, תרומות, webhooks כושלים.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_organization',
      description: 'חיפוש ארגון לפי שם או slug.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'מחרוזת חיפוש' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_org_details',
      description: 'פרטים מלאים של ארגון: קמפיינים, תרומות אחרונות, משתמשים.',
      parameters: {
        type: 'object',
        properties: {
          org_id: { type: 'string', description: 'UUID של הארגון' },
        },
        required: ['org_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_organization',
      description: 'מאשר ארגון ממתין ומאפשר למנהל להיכנס למערכת.',
      parameters: {
        type: 'object',
        properties: {
          org_id: { type: 'string', description: 'UUID של הארגון לאישור' },
        },
        required: ['org_id'],
      },
    },
  },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const supabase = await createServiceClient()

  try {
    switch (name) {
      case 'get_organizations': {
        let query = supabase
          .from('organizations')
          .select('id, name, slug, status, wants_sms, registration_number, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(input.limit) || 20)

        if (input.status && input.status !== 'all') query = query.eq('status', input.status)

        const { data, error } = await query
        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_campaigns': {
        let query = supabase
          .from('campaigns')
          .select('id, org_id, title, slug, status, goal_amount, raised_amount, start_at, end_at, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(input.limit) || 20)

        if (input.org_id) query = query.eq('org_id', input.org_id)
        if (input.status && input.status !== 'all') query = query.eq('status', input.status)

        const { data, error } = await query
        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_donations': {
        let query = supabase
          .from('donations')
          .select('id, org_id, campaign_id, amount, donor_name, payment_status, kesher_transaction_id, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(input.limit) || 30)

        if (input.org_id) query = query.eq('org_id', input.org_id)
        if (input.campaign_id) query = query.eq('campaign_id', input.campaign_id)
        if (input.payment_status && input.payment_status !== 'all') {
          query = query.eq('payment_status', input.payment_status)
        }
        if (input.days_back) {
          const since = new Date()
          since.setDate(since.getDate() - Number(input.days_back))
          query = query.gte('created_at', since.toISOString())
        }

        const { data, error } = await query
        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_webhook_logs': {
        let query = supabase
          .from('webhook_logs')
          .select('id, source, signature_valid, processed, error, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(input.limit) || 20)

        if (input.processed !== undefined && input.processed !== null) {
          query = query.eq('processed', input.processed)
        }
        if (input.signature_valid !== undefined && input.signature_valid !== null) {
          query = query.eq('signature_valid', input.signature_valid)
        }

        const { data, error } = await query
        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_sms_logs': {
        let query = supabase
          .from('sms_logs')
          .select('id, org_id, to_phone, message, status, sent_at, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(input.limit) || 20)

        if (input.status && input.status !== 'all') query = query.eq('status', input.status)
        if (input.org_id) query = query.eq('org_id', input.org_id)

        const { data, error } = await query
        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_system_stats': {
        const [orgs, campaigns, donations, pendingDonations, failedWebhooks, failedSms] =
          await Promise.all([
            supabase.from('organizations').select('status'),
            supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('donations').select('amount').eq('payment_status', 'completed'),
            supabase.from('donations').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending'),
            supabase.from('webhook_logs').select('id', { count: 'exact', head: true }).eq('processed', false),
            supabase.from('sms_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
          ])

        const orgsByStatus = orgs.data?.reduce((acc: Record<string, number>, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1
          return acc
        }, {})

        const totalRaised = donations.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

        return JSON.stringify({
          organizations: { total: orgs.data?.length || 0, by_status: orgsByStatus },
          active_campaigns: campaigns.count || 0,
          total_raised_ils: totalRaised,
          total_donations: donations.data?.length || 0,
          pending_donations: pendingDonations.count || 0,
          unprocessed_webhooks: failedWebhooks.count || 0,
          failed_sms: failedSms.count || 0,
        }, null, 2)
      }

      case 'search_organization': {
        const q = String(input.query || '')
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, status, created_at')
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .limit(10)

        if (error) return `שגיאה: ${error.message}`
        return JSON.stringify(data, null, 2)
      }

      case 'get_org_details': {
        const orgId = String(input.org_id)
        const [org, campaigns, recentDonations, users] = await Promise.all([
          supabase.from('organizations').select('*').eq('id', orgId).single(),
          supabase.from('campaigns').select('id, title, status, goal_amount, raised_amount').eq('org_id', orgId),
          supabase.from('donations').select('amount, payment_status, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(10),
          supabase.from('profiles').select('id, full_name, role, phone').eq('org_id', orgId),
        ])

        const totalRaised = recentDonations.data?.filter(d => d.payment_status === 'completed').reduce((s, d) => s + d.amount, 0) || 0

        return JSON.stringify({
          organization: org.data,
          campaigns: campaigns.data,
          donations_summary: { count: recentDonations.data?.length, total_raised: totalRaised },
          users: users.data,
        }, null, 2)
      }

      case 'approve_organization': {
        const orgId = String(input.org_id)
        const { data: org, error } = await supabase
          .from('organizations')
          .update({ status: 'active' })
          .eq('id', orgId)
          .select('owner_id, name')
          .single()

        if (error) return `שגיאה: ${error.message}`

        if (org?.owner_id) {
          await supabase.from('profiles').update({ org_id: orgId }).eq('id', org.owner_id)
        }

        return `✅ הארגון "${org?.name}" אושר בהצלחה.`
      }

      default:
        return `כלי לא מוכר: ${name}`
    }
  } catch (err) {
    return `שגיאה: ${String(err)}`
  }
}

// ─── API Route ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `אתה סוכן AI של Kafool — מערכת הפעלה לגיוס כספים.
תפקידך: לעזור לסופר מנהל לנתח את המערכת, לאתר בעיות, ולתת המלצות.

יכולותיך:
- בדיקת ארגונים ממתינים לאישור ואישורם
- ניתוח ביצועי קמפיינים
- זיהוי בעיות סליקה (webhooks כושלים, תרומות ממתינות)
- בדיקת כשלים ב-SMS
- ניתוח נתוני תרומות

כללים:
- עבוד תמיד בעברית
- לפני שאתה מנתח — משוך נתונים עדכניים מהמערכת
- היה ממוקד ועסקי
- כשאתה מזהה בעיה — הסבר אותה בבירור והצע פתרון`

export async function POST(request: NextRequest) {
  const { messages } = await request.json()

  const apiMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  try {
    let response = await groq.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      tools,
      tool_choice: 'auto',
      max_tokens: 4096,
      temperature: 0.3,
    })

    let msg = response.choices[0].message
    let iterations = 0

    // Agentic loop — max 4 iterations to avoid timeout
    while (msg.tool_calls && msg.tool_calls.length > 0 && iterations < 4) {
      iterations++
      apiMessages.push(msg)

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (call) => {
          let input: Record<string, unknown> = {}
          try { input = JSON.parse(call.function.arguments) } catch {}
          const result = await executeTool(call.function.name, input)
          return {
            role: 'tool' as const,
            tool_call_id: call.id,
            content: result,
          }
        })
      )

      apiMessages.push(...toolResults)

      response = await groq.chat.completions.create({
        model: MODEL,
        messages: apiMessages,
        tools,
        tool_choice: 'auto',
        max_tokens: 2048,
        temperature: 0.3,
      })

      msg = response.choices[0].message
    }

    return NextResponse.json({ reply: msg.content || 'אין תשובה' })
  } catch (err) {
    console.error('[Agent Error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
