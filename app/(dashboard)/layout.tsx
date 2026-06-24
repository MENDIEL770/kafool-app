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
  // Module entitlements of the in-scope org (which products it's subscribed to).
  const ownOrg = (profile as { organizations?: { has_fundraising?: boolean; has_kafool_plus?: boolean } }).organizations
  let entFundraising = ownOrg?.has_fundraising !== false
  let entKafoolPlus = ownOrg?.has_kafool_plus === true
  if (ctx.isSuperAdmin && ctx.orgId) {
    const { data: o } = await supabase.from('organizations').select('name, status, has_fundraising, has_kafool_plus').eq('id', ctx.orgId).single()
    contextOrgName = o?.name ?? null
    contextOrgStatus = o?.status
    entFundraising = o?.has_fundraising !== false
    entKafoolPlus = o?.has_kafool_plus === true
  }

  // Module route gates (super-admins exempt; coordinators/callers handled above).
  if (!ctx.isSuperAdmin) {
    const fundraisingRoute = ['/dashboard', '/campaigns', '/reports', '/sms'].some(p => pathname === p || pathname.startsWith(p + '/'))
    if (!entFundraising && fundraisingRoute) redirect(entKafoolPlus ? '/kafool-plus' : '/onboarding')
    if (!entKafoolPlus && inKafoolPlus) redirect(entFundraising ? '/dashboard' : '/onboarding')
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
      <Sidebar profile={profile} contextOrgName={contextOrgName} viewingOtherOrg={ctx.isSuperAdmin && !!ctx.orgId} lockToKafoolPlus={false} entitlements={{ fundraising: entFundraising, kafoolPlus: entKafoolPlus }} />
      <main className="flex-1 min-w-0 p-4 lg:p-6 pt-[4.5rem] lg:pt-6 overflow-x-hidden">{children}</main>
    </div>
  )
}
