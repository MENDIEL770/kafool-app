import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
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
  const pathname = (await headers()).get('x-pathname') || ''
  const inKafoolPlus = pathname.startsWith('/kafool-plus')
  const kp = await getKafoolPlusContext(supabase)

  // Coordinators/callers are Kafool+ users — confined to the module, with the
  // regular dashboard gates skipped (they may not have an org of their own).
  if (kp.role === 'coordinator' || kp.role === 'caller') {
    if (!inKafoolPlus) redirect('/kafool-plus')
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar profile={profile} contextOrgName={null} viewingOtherOrg={false} lockToKafoolPlus />
        <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
      </div>
    )
  }

  // Regular-dashboard gates — skipped on /kafool-plus so that the Kafool+
  // membership check decides access there (a non-member just sees "no access",
  // and super-admins/managers see the manager view instead of being bounced).
  if (!inKafoolPlus) {
    if (!ctx.isSuperAdmin && !profile.org_id) redirect('/onboarding')
    if (ctx.isSuperAdmin && ctx.isGlobal) redirect('/super-admin/orgs')
  }

  // Resolve the org currently in scope (own org, or the one a super admin entered)
  let contextOrgName: string | null = (profile as { organizations?: { name: string } }).organizations?.name ?? null
  let contextOrgStatus: string | undefined = (profile as { organizations?: { status: string } }).organizations?.status
  if (ctx.isSuperAdmin && ctx.orgId) {
    const { data: o } = await supabase.from('organizations').select('name, status').eq('id', ctx.orgId).single()
    contextOrgName = o?.name ?? null
    contextOrgStatus = o?.status
  }

  // Org must be active (super-admins and the Kafool+ pages are exempt)
  if (!ctx.isSuperAdmin && !inKafoolPlus && contextOrgStatus !== 'active') {
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
      <Sidebar profile={profile} contextOrgName={contextOrgName} viewingOtherOrg={ctx.isSuperAdmin && !!ctx.orgId} lockToKafoolPlus={false} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
