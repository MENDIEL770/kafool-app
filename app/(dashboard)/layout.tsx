import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const ctx = await getContext(supabase)

  if (!ctx.isSuperAdmin && !profile.org_id) redirect('/onboarding')
  if (ctx.isSuperAdmin && ctx.isGlobal) redirect('/super-admin/orgs')

  // Resolve the org currently in scope (own org, or the one a super admin entered)
  let contextOrgName: string | null = (profile as { organizations?: { name: string } }).organizations?.name ?? null
  let contextOrgStatus: string | undefined = (profile as { organizations?: { status: string } }).organizations?.status
  if (ctx.isSuperAdmin && ctx.orgId) {
    const { data: o } = await supabase.from('organizations').select('name, status').eq('id', ctx.orgId).single()
    contextOrgName = o?.name ?? null
    contextOrgStatus = o?.status
  }

  // Org must be active (super-admins exempt)
  if (!ctx.isSuperAdmin && contextOrgStatus !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
        <div className="space-y-3">
          <h2 className="text-xl font-bold">הארגון שלך ממתין לאישור</h2>
          <p className="text-gray-500">נחזור אליך בקרוב.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} contextOrgName={contextOrgName} viewingOtherOrg={ctx.isSuperAdmin && !!ctx.orgId} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
