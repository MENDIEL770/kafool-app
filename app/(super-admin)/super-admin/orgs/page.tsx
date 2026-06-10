import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgsPageClient from './OrgsPageClient'

export default async function SuperAdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, phone, id)')
    .order('created_at', { ascending: false })

  return <OrgsPageClient orgs={orgs ?? []} />
}
