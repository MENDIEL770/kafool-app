import { createClient as createAdmin } from '@supabase/supabase-js'
import KafoolRequestsClient, { type AccessRequest, type CampaignOption } from './KafoolRequestsClient'

export const dynamic = 'force-dynamic'

// Access is restricted to super_admin by the (super-admin) layout.
export default async function KafoolRequestsPage() {
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [reqRes, campRes] = await Promise.all([
    admin.from('kafoolplus_access_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    admin.from('kafoolplus_master_campaigns').select('id, name, organizations(name)').order('created_at', { ascending: false }),
  ])
  const campaigns: CampaignOption[] = (campRes.data ?? []).map((c: { id: string; name: string; organizations?: { name?: string } | { name?: string }[] | null }) => ({
    id: c.id,
    name: c.name,
    orgName: Array.isArray(c.organizations) ? c.organizations[0]?.name ?? null : c.organizations?.name ?? null,
  }))

  return <KafoolRequestsClient requests={(reqRes.data ?? []) as AccessRequest[]} campaigns={campaigns} />
}
