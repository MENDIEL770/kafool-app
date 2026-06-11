import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgsLeadsView from './OrgsLeadsView'

export default async function SuperAdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const [{ data: orgs }, { data: leads }] = await Promise.all([
    supabase
      .from('organizations')
      .select('*, profiles!organizations_owner_id_fkey(full_name, phone, id)')
      .order('created_at', { ascending: false }),
    supabase
      .from('sales_leads')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return <OrgsLeadsView orgs={orgs ?? []} leads={leads ?? []} />
}
