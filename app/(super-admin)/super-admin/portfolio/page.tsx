import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortfolioAdminClient, { type PortfolioItem, type PortfolioLabel } from './PortfolioAdminClient'

export default async function SuperAdminPortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // Labels are optional — if the table isn't created yet the query just returns
  // null and the UI falls back to an empty managed list.
  const [itemsRes, labelsRes] = await Promise.all([
    supabase
      .from('portfolio_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolio_labels')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ])

  return (
    <PortfolioAdminClient
      items={(itemsRes.data ?? []) as PortfolioItem[]}
      labels={(labelsRes.data ?? []) as PortfolioLabel[]}
    />
  )
}
