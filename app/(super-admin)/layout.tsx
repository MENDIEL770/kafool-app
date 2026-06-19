import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import Sidebar from '@/components/layout/Sidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') redirect('/dashboard')

  const ctx = await getContext(supabase)
  let contextOrgName: string | null = null
  if (ctx.orgId) {
    const { data: o } = await supabase.from('organizations').select('name').eq('id', ctx.orgId).single()
    contextOrgName = o?.name ?? null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} contextOrgName={contextOrgName} viewingOtherOrg={!!ctx.orgId} />
      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
