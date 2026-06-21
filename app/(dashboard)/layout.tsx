import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getContext } from '@/lib/tenancy'
import { getKafoolPlusContext } from '@/lib/kafoolplus'
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

  // If no org yet → send to onboarding
  if (!ctx.isSuperAdmin && !profile.org_id) {
    redirect('/onboarding')
  }

  // Super admin in global mode → the overview lives at /super-admin/orgs.
  // To use the dashboard they must first "enter" an org.
  if (ctx.isSuperAdmin && ctx.isGlobal) {
    redirect('/super-admin/orgs')
  }

  // Resolve the org currently in scope (own org, or the one a super admin entered)
  let contextOrgName: string | null = (profile as { organizations?: { name: string } }).organizations?.name ?? null
  let contextOrgStatus: string | undefined = (profile as { organizations?: { status: string } }).organizations?.status
  if (ctx.isSuperAdmin && ctx.orgId) {
    const { data: o } = await supabase.from('organizations').select('name, status').eq('id', ctx.orgId).single()
    contextOrgName = o?.name ?? null
    contextOrgStatus = o?.status
  }

  // Org must be active (or user is super_admin)
  if (!ctx.isSuperAdmin && contextOrgStatus !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
        <div className="space-y-3">
          <div className="text-4xl"></div>
          <h2 className="text-xl font-bold">הארגון שלך ממתין לאישור</h2>
          <p className="text-gray-500">נחזור אליך בקרוב.</p>
        </div>
      </div>
    )
  }

  // Kafool+-only lock: coordinators/callers of an org flagged kafoolplus_only
  // are restricted to the Kafool+ module (the sidebar hides everything else).
  let lockToKafoolPlus = false
  const kp = await getKafoolPlusContext(supabase)
  if (kp.role === 'coordinator' || kp.role === 'caller') {
    if (kp.orgId) {
      const admin = await createServiceClient()
      const { data: o } = await admin.from('organizations').select('kafoolplus_only').eq('id', kp.orgId).maybeSingle()
      lockToKafoolPlus = !!o?.kafoolplus_only
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} contextOrgName={contextOrgName} viewingOtherOrg={ctx.isSuperAdmin && !!ctx.orgId} lockToKafoolPlus={lockToKafoolPlus} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
