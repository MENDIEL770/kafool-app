import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgsLeadsView from './OrgsLeadsView'

export default async function SuperAdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const [{ data: orgsRaw }, { data: leads }] = await Promise.all([
    supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('sales_leads')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  // owner_id references auth.users (not profiles), so there is no PostgREST
  // relationship to embed — fetch the owner profiles separately and attach them.
  const ownerIds = [...new Set((orgsRaw ?? []).map(o => o.owner_id).filter(Boolean))]
  const { data: owners } = ownerIds.length
    ? await supabase.from('profiles').select('id, full_name, phone').in('id', ownerIds)
    : { data: [] as { id: string; full_name: string; phone: string | null }[] }
  const ownerMap = new Map((owners ?? []).map(p => [p.id, p]))

  const orgs = (orgsRaw ?? []).map(o => ({
    ...o,
    profiles: o.owner_id ? ownerMap.get(o.owner_id) ?? null : null,
  }))

  // Platform-wide aggregates + raised-amount per org (sum of each org's campaigns)
  const { data: campaignRows } = await supabase.from('campaigns').select('org_id, raised_amount')
  const raisedByOrg: Record<string, number> = {}
  let totalRaised = 0
  for (const c of campaignRows ?? []) {
    const amt = Number(c.raised_amount) || 0
    if (c.org_id) raisedByOrg[c.org_id] = (raisedByOrg[c.org_id] || 0) + amt
    totalRaised += amt
  }
  const { count: donationCount } = await supabase
    .from('donations').select('*', { count: 'exact', head: true }).eq('payment_status', 'completed')

  const stats = {
    totalRaised,
    orgCount: orgs.length,
    campaignCount: campaignRows?.length || 0,
    donationCount: donationCount || 0,
  }

  return <OrgsLeadsView orgs={orgs} leads={leads ?? []} raisedByOrg={raisedByOrg} stats={stats} />
}
