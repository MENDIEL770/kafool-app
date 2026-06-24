import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlusContext } from '@/lib/plus/context'
import { loadPlusData } from '@/lib/plus/data'
import PlusProvider from './PlusProvider'
import type { SessionUser } from '@/lib/plus/store'

export const dynamic = 'force-dynamic'

export default async function PlusLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/kafool-plus-login')

  const ctx = await getPlusContext(supabase)
  if (!ctx.role) redirect('/kafool-plus-login')

  // Entitlement gate: the in-scope org must be subscribed to Kafool+ (super-admin exempt).
  if (!ctx.isSuperAdmin && ctx.orgId) {
    const admin = await createServiceClient()
    const { data: org } = await admin.from('organizations').select('has_kafool_plus').eq('id', ctx.orgId).maybeSingle()
    if (org && org.has_kafool_plus === false) redirect('/dashboard')
  }

  const data = await loadPlusData(ctx)

  // Resolve a display name for the header.
  let displayName = ctx.email ?? ''
  if (ctx.member?.caller_group_id) {
    const cg = data.callerGroups.find(c => c.id === ctx.member!.caller_group_id)
    if (cg) displayName = cg.display_name
  } else if (ctx.role === 'manager' || ctx.role === 'super_admin') displayName = 'מנהל ראשי'
  else if (ctx.role === 'coordinator') displayName = 'רכז'

  // Managers/super-admins without an explicit campaign scope default to the org's
  // first top-level (master) campaign, so every manager screen has a root.
  const fallbackCampaign = (ctx.role === 'manager' && !ctx.member?.campaign_id)
    ? (data.campaigns.find(c => c.parent_campaign_id === null)?.id ?? null)
    : null

  const session: SessionUser = {
    email: ctx.email ?? '',
    role: ctx.role,
    organization_id: ctx.orgId ?? '',
    campaign_id: ctx.member?.campaign_id ?? fallbackCampaign,
    caller_group_id: ctx.member?.caller_group_id ?? null,
    display_name: displayName,
  }

  return (
    <div className="kafool-plus min-h-screen" dir="rtl">
      <PlusProvider data={data} session={session}>
        {children}
      </PlusProvider>
    </div>
  )
}
