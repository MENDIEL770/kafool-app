import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import LeadsClient, { type Lead } from './LeadsClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // Service role: the leads table has RLS on with no public policy.
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin
    .from('campaign_leads')
    .select('id, token, name, phone, org, score, profile, range_low, range_high, goal, source, sms_sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <LeadsClient initial={(data ?? []) as Lead[]} />
      </div>
    </div>
  )
}
