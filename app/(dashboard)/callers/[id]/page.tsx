import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
interface LeadActivity {
  id: string
  name: string
  phone: string
  status: string
  notes: string | null
  updated_at?: string
}

interface CallerWithProfile {
  id: string
  profile_id: string
  org_id: string
  campaign_id: string
  status: string
  total_called: number
  total_donated: number
  personal_goal: number
  created_at: string
  profiles: { full_name: string; phone: string | null } | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    calling: { label: 'בשיחה', className: 'bg-green-100 text-green-700' },
    idle: { label: 'זמין', className: 'bg-blue-100 text-blue-700' },
    break: { label: 'הפסקה', className: 'bg-yellow-100 text-yellow-700' },
    offline: { label: 'לא מחובר', className: 'bg-gray-100 text-gray-500' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' }
  return <Badge className={s.className}>{s.label}</Badge>
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'חדש', assigned: 'שויך', called: 'לא ענה', donated: 'תרם',
  callback: 'יחזור', dnc: 'ביטול', skip: 'דילוג',
}

export default async function CallerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: caller } = await supabase
    .from('callers')
    .select('*, profiles(full_name, phone)')
    .eq('id', id)
    .single()

  if (!caller) notFound()

  const c = caller as CallerWithProfile
  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayLeads }, { data: allCallers }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, phone, status, updated_at, notes')
      .eq('caller_id', id)
      .gte('updated_at', today)
      .order('updated_at', { ascending: false }),
    supabase
      .from('callers')
      .select('id, total_called, total_donated')
      .eq('org_id', c.org_id),
  ])

  const answeredLeads = (todayLeads as LeadActivity[])?.filter(l => l.status !== 'new' && l.status !== 'assigned') ?? []
  const donatedLeads = (todayLeads as LeadActivity[])?.filter(l => l.status === 'donated') ?? []

  const totalCalls = c.total_called || 0
  const answeredCount = answeredLeads.length
  const donationsCount = donatedLeads.length
  const totalRaised = c.total_donated || 0
  const answerRate = totalCalls > 0 ? Math.round((answeredCount / totalCalls) * 100) : 0
  const conversionRate = answeredCount > 0 ? Math.round((donationsCount / answeredCount) * 100) : 0
  const goalPct = c.personal_goal > 0 ? Math.min(100, Math.round((totalRaised / c.personal_goal) * 100)) : 0

  // Campaign average conversion
  const campAvgConversion = (() => {
    if (!allCallers || allCallers.length === 0) return 0
    const totalCampCalled = allCallers.reduce((s, cl) => s + (cl.total_called || 0), 0)
    // Approximate: donated / called for campaign
    return totalCampCalled > 0 ? Math.round((donationsCount / totalCampCalled) * 100) : 0
  })()

  const rank = (allCallers ?? [])
    .sort((a, b) => (b.total_donated || 0) - (a.total_donated || 0))
    .findIndex(cl => cl.id === id) + 1

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.profiles?.full_name || 'טלפן'}</h1>
            {c.profiles?.phone && <div className="text-sm text-gray-400">{c.profiles.phone}</div>}
          </div>
          <StatusBadge status={c.status} />
          {rank > 0 && <span className="text-sm text-gray-500">דירוג #{rank}</span>}
        </div>
        <div className="text-left">
          <div className="text-xs text-gray-400 mb-1">יעד אישי — {goalPct}%</div>
          <div className="w-48 h-3 bg-gray-100 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="text-xs text-gray-400 mt-1">₪{totalRaised.toLocaleString()} / ₪{c.personal_goal.toLocaleString()}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'סה"כ שיחות', value: totalCalls, color: 'text-gray-800' },
          { label: 'נענו', value: answeredCount, color: 'text-blue-600' },
          { label: 'תרומות', value: donationsCount, color: 'text-green-600' },
          { label: 'גייס', value: `₪${totalRaised.toLocaleString()}`, color: 'text-green-600' },
          { label: 'אחוז מענה', value: `${answerRate}%`, color: 'text-blue-600' },
          { label: 'המרה', value: `${conversionRate}%`, color: 'text-purple-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-gray-500">{stat.label}</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Today's activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">פעילות היום</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayLeads || todayLeads.length === 0 ? (
            <p className="text-sm text-gray-400">אין פעילות היום עדיין.</p>
          ) : (
            <div className="space-y-2">
              {(todayLeads as LeadActivity[]).map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{lead.name}</div>
                    {lead.notes && <div className="text-xs text-gray-400">{lead.notes}</div>}
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs text-gray-400">
                      {lead.updated_at ? new Date(lead.updated_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      lead.status === 'donated' ? 'bg-green-100 text-green-700' :
                      lead.status === 'dnc' ? 'bg-red-100 text-red-700' :
                      lead.status === 'callback' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader><CardTitle className="text-base">השוואה לממוצע קמפיין</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">אחוז המרה שלי</span>
              <span className="font-bold text-purple-600">{conversionRate}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(conversionRate, 100)}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ממוצע קמפיין</span>
              <span className="font-bold text-gray-500">{campAvgConversion}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full">
              <div className="h-full bg-gray-300 rounded-full" style={{ width: `${Math.min(campAvgConversion, 100)}%` }} />
            </div>
          </div>
          {conversionRate >= campAvgConversion ? (
            <p className="text-sm text-green-600 font-medium">🌟 מעל ממוצע הקמפיין!</p>
          ) : (
            <p className="text-sm text-gray-400">המשך כך, אתה יכול לעבור את הממוצע!</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
