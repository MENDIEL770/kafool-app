import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WebhooksClient, { type WebhookLog } from './WebhooksClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminWebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // webhook_logs is service-role only (RLS with no policy), so read with the
  // service client. Latest 300 incoming payment webhooks.
  const { createServiceClient } = await import('@/lib/supabase/server')
  const svc = await createServiceClient()
  const { data: logs } = await svc
    .from('webhook_logs')
    .select('id, source, ip, note, body, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  // Resolve campaign ids → names for the routing column.
  const { data: campaigns } = await svc.from('campaigns').select('id, title, slug')
  const campaignsById: Record<string, { title: string; slug: string }> = {}
  for (const c of campaigns ?? []) campaignsById[c.id as string] = { title: c.title as string, slug: c.slug as string }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-screen-2xl mx-auto">
        <WebhooksClient logs={(logs ?? []) as WebhookLog[]} campaignsById={campaignsById} />
      </div>
    </div>
  )
}
