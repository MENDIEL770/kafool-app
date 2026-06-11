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

  return <OrgsLeadsView orgs={orgs} leads={leads ?? []} />
}
