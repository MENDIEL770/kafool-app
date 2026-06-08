import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  const query = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'super_admin') {
    query.eq('org_id', profile!.org_id)
  }

  const { data: campaigns } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">קמפיינים</h1>
        <Link href="/campaigns/new" className={buttonVariants()}>+ קמפיין חדש</Link>
      </div>

      {campaigns?.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">🎯</div>
            <p>אין קמפיינים עדיין.</p>
            <Link href="/campaigns/new" className={`${buttonVariants()} mt-4 inline-flex`}>
              צור קמפיין ראשון
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {campaigns?.map((c) => {
          const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)) : 0
          return (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="hover:border-blue-200 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900 truncate">{c.title}</h2>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                          {c.status === 'active' ? 'פעיל' : c.status === 'draft' ? 'טיוטה' : 'הסתיים'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        kafool.com/{c.slug}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">גויס</span>
                          <span className="font-medium">
                            ₪{(c.raised_amount || 0).toLocaleString('he-IL')} / ₪{(c.goal_amount || 0).toLocaleString('he-IL')}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 text-left">{pct}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
