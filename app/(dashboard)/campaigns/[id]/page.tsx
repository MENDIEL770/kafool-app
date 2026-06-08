import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CampaignStatusToggle from './CampaignStatusToggle'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', campaign.org_id)
    .single()

  const [{ data: donations }, { count: donationCount }] = await Promise.all([
    supabase
      .from('donations')
      .select('id, donor_name, amount, created_at, payment_status')
      .eq('campaign_id', id)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('payment_status', 'completed'),
  ])

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, goal_amount, raised_amount')
    .eq('campaign_id', id)

  const pct = campaign.goal_amount > 0
    ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status === 'active' ? 'פעיל' : campaign.status === 'draft' ? 'טיוטה' : 'הסתיים'}
            </Badge>
          </div>
          <div className="text-sm text-gray-400">kafool.com/{campaign.slug}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CampaignStatusToggle campaignId={id} currentStatus={campaign.status} />
          {org?.slug && (
            <Link href={`/${org.slug}`} target="_blank" className={buttonVariants({ variant: 'outline' })}>
              🌐 פתח דף גיוס
            </Link>
          )}
          <Link href={`/campaigns/${id}/donors`} className={buttonVariants({ variant: 'outline' })}>
            👥 תורמים
          </Link>
          <Link href={`/campaigns/${id}/media`} className={buttonVariants({ variant: 'outline' })}>
            🖼️ מדיה
          </Link>
          <Link href={`/campaigns/${id}/settings`} className={buttonVariants({ variant: 'outline' })}>
            הגדרות
          </Link>
          <Link href={`/campaigns/${id}/builder`} className={buttonVariants({ variant: 'outline' })}>
            🎨 עורך תבנית
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">סה"כ גויס</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₪{(campaign.raised_amount || 0).toLocaleString('he-IL')}</div>
            <div className="text-sm text-gray-400 mt-1">מתוך ₪{(campaign.goal_amount || 0).toLocaleString('he-IL')}</div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">{pct}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">תרומות</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{donationCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">קבוצות</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{groups?.length || 0}</div>
            <Link href={`/campaigns/${id}/groups`} className="text-xs text-blue-600 hover:underline mt-1 block">
              נהל קבוצות
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Donations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">תרומות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          {donations?.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">אין תרומות עדיין</p>
          )}
          <div className="divide-y divide-gray-50">
            {donations?.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{d.donor_name || 'אנונימי'}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(d.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
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
