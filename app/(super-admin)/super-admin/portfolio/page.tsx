import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortfolioAdminClient, { type PortfolioItem } from './PortfolioAdminClient'

export default async function SuperAdminPortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return <PortfolioAdminClient items={(data ?? []) as PortfolioItem[]} />
}
