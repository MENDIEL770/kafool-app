import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, Activity, ArrowLeft, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, full_name, role')
    .eq('id', user!.id)
    .single()

  const [{ data: campaigns }, { data: recentDonations }, { count: totalDonations }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, title, slug, status, raised_amount, goal_amount')
      .eq('org_id', profile!.org_id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('donations')
      .select('id, donor_name, amount, created_at, campaigns(title)')
      .eq('org_id', profile!.org_id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile!.org_id)
      .eq('payment_status', 'completed'),
  ])

  const totalRaised = campaigns?.reduce((sum, c) => sum + (c.raised_amount || 0), 0) || 0
  const activeCampaigns = campaigns?.filter((c) => c.status === 'active').length || 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="space-y-8" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="text-2xl font-bold mt-0.5">לוח בקרה</h1>
        </div>
        <Link href="/campaigns/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="w-4 h-4 ml-1.5" />
          קמפיין חדש
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/60 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">סה&quot;כ גויס</p>
              <p className="text-3xl font-bold text-blue-600">
                ₪{totalRaised.toLocaleString('he-IL')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/60 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">קמפיינים פעילים</p>
              <p className="text-3xl font-bold text-emerald-600">{activeCampaigns}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/60 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">סה&quot;כ תרומות</p>
              <p className="text-3xl font-bold text-purple-600">{(totalDonations ?? 0).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Campaigns */}
        <div className="bg-white rounded-2xl shadow-sm border border-border/60">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
            <h2 className="font-semibold">קמפיינים</h2>
            <Link href="/campaigns" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              הכל
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {campaigns?.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>אין קמפיינים עדיין</p>
                <Link href="/campaigns/new" className="text-blue-600 hover:underline text-xs mt-1 block">
                  צור קמפיין ראשון
                </Link>
              </div>
            )}
            {campaigns?.map((c) => {
              const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)) : 0
              return (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
                  <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium truncate">{c.title}</span>
                        <Badge
                          variant={c.status === 'active' ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {c.status === 'active' ? 'פעיל' : c.status === 'draft' ? 'טיוטה' : 'הסתיים'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          ₪{(c.raised_amount || 0).toLocaleString()} / ₪{(c.goal_amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Donations */}
        <div className="bg-white rounded-2xl shadow-sm border border-border/60">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
            <h2 className="font-semibold">תרומות אחרונות</h2>
            <Link href="/reports" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              דוחות
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/40">
            {recentDonations?.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>אין תרומות עדיין</p>
              </div>
            )}
            {recentDonations?.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                    {(d.donor_name || 'א')[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{d.donor_name || 'אנונימי'}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-600">
                  ₪{(d.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
