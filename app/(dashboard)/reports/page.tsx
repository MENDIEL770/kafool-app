import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()

  const [{ data: campaigns }, { data: donations }, { data: callers }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, title, raised_amount, goal_amount, status')
      .eq('org_id', profile!.org_id)
      .order('raised_amount', { ascending: false }),
    supabase
      .from('donations')
      .select('amount, created_at, campaign_id, caller_id')
      .eq('org_id', profile!.org_id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false }),
    supabase
      .from('callers')
      .select('id, profiles(full_name)')
      .eq('org_id', profile!.org_id),
  ])

  const totalRaised = donations?.reduce((s, d) => s + (d.amount || 0), 0) || 0
  const avgDonation = donations?.length ? Math.round(totalRaised / donations.length) : 0
  const maxRaised = campaigns && campaigns.length > 0 ? Math.max(...campaigns.map((c) => c.raised_amount || 0)) : 1

  // Daily breakdown — last 14 days
  const today = new Date()
  const days: { label: string; date: string; amount: number; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = i === 0 ? 'היום' : i === 1 ? 'אתמול' : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
    days.push({ label, date: dateStr, amount: 0, count: 0 })
  }

  donations?.forEach((d) => {
    const dateStr = d.created_at.slice(0, 10)
    const day = days.find((dd) => dd.date === dateStr)
    if (day) { day.amount += d.amount || 0; day.count++ }
  })

  const maxDay = Math.max(...days.map((d) => d.amount), 1)

  // Caller leaderboard
  const callerMap: Record<string, { name: string; amount: number; count: number }> = {}
  if (callers) {
    callers.forEach((c) => {
      const profiles = c.profiles as unknown as { full_name: string } | null
      const name = profiles?.full_name || 'לא ידוע'
      callerMap[c.id] = { name, amount: 0, count: 0 }
    })
  }
  donations?.forEach((d) => {
    if (d.caller_id && callerMap[d.caller_id]) {
      callerMap[d.caller_id].amount += d.amount || 0
      callerMap[d.caller_id].count++
    }
  })
  const callerLeaderboard = Object.values(callerMap)
    .filter((c) => c.count > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">דוחות</h1>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">סה&quot;כ גויס</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">₪{totalRaised.toLocaleString('he-IL')}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">תרומות</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-700">{donations?.length || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">ממוצע תרומה</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-700">₪{avgDonation.toLocaleString('he-IL')}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">קמפיינים</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-700">{campaigns?.length || 0}</div></CardContent>
        </Card>
      </div>

      {/* Daily chart — last 14 days */}
      <Card>
        <CardHeader><CardTitle className="text-base">תרומות — 14 ימים אחרונים</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600"
                    style={{ height: d.amount > 0 ? `${Math.max(4, Math.round((d.amount / maxDay) * 100))}%` : '2px', minHeight: '2px' }}
                    title={`₪${d.amount.toLocaleString()} (${d.count} תרומות)`}
                  />
                </div>
                <span className="text-[9px] text-gray-400 whitespace-nowrap">{d.label}</span>
              </div>
            ))}
          </div>
          {/* Hover tooltip handled by browser title */}
          <div className="flex justify-between text-xs text-gray-400 mt-2 border-t pt-2">
            <span>
              סה&quot;כ 14 ימים: ₪{days.reduce((s, d) => s + d.amount, 0).toLocaleString('he-IL')}
            </span>
            <span>
              {days.reduce((s, d) => s + d.count, 0)} תרומות
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Campaign leaderboard */}
        <Card>
          <CardHeader><CardTitle className="text-base">דירוג קמפיינים</CardTitle></CardHeader>
          <CardContent>
            {campaigns?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">אין נתונים</p>}
            <div className="space-y-4">
              {campaigns?.map((c) => {
                const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)) : 0
                const barW = maxRaised > 0 ? Math.round((c.raised_amount / maxRaised) * 100) : 0
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[55%]">{c.title}</span>
                      <span className="text-gray-500 shrink-0">
                        ₪{(c.raised_amount || 0).toLocaleString()} <span className="text-xs text-gray-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${barW}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Caller leaderboard */}
        <Card>
          <CardHeader><CardTitle className="text-base">טופ מגייסים</CardTitle></CardHeader>
          <CardContent>
            {callerLeaderboard.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">אין נתוני מגייסים</p>
            )}
            <div className="space-y-3">
              {callerLeaderboard.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-lg font-black text-gray-300 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.count} תרומות</div>
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    ₪{c.amount.toLocaleString('he-IL')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent donations */}
      <Card>
        <CardHeader><CardTitle className="text-base">תרומות אחרונות</CardTitle></CardHeader>
        <CardContent>
          {donations?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">אין תרומות</p>}
          <div className="divide-y divide-gray-50">
            {donations?.slice(0, 20).map((d, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="text-sm font-semibold text-green-600">₪{(d.amount || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
