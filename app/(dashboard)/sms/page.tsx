import { createClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import SmsClient from './SmsClient'

export default async function SmsPage() {
  const supabase = await createClient()
  const { orgId } = await getContext(supabase)

  const [{ data: rules }, { data: logs }, { data: campaigns }] = await Promise.all([
    supabase
      .from('automation_rules')
      .select('*, campaigns(title)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sms_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('campaigns')
      .select('id, title')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <SmsClient
      initialRules={rules || []}
      initialLogs={logs || []}
      campaigns={campaigns || []}
      orgId={orgId ?? ''}
    />
  )
}
