import type { SupabaseClient } from '@supabase/supabase-js'
import { getContext } from './tenancy'

// Kafool+ role/scope resolution. A member is identified by EMAIL: their
// kafoolplus_members row carries the role + scope (campaign/branch/group). On
// first login we claim the pending row (set user_id). Org admins / super admins
// act as implicit managers for the org currently in scope.

export type KpRole = 'manager' | 'coordinator' | 'caller'

export interface KpMember {
  id: string
  role: KpRole
  master_campaign_id: string | null
  branch_id: string | null
  caller_group_id: string | null
}

export interface KpContext {
  role: KpRole | null
  orgId: string | null
  isSuperAdmin: boolean
  member: KpMember | null   // null for an implicit manager (org admin/super admin)
}

export async function getKafoolPlusContext(supabase: SupabaseClient): Promise<KpContext> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, orgId: null, isSuperAdmin: false, member: null }

  const ctx = await getContext(supabase)
  const cols = 'id, role, org_id, master_campaign_id, branch_id, caller_group_id'

  // 1) explicit membership by user_id
  let { data: member } = await supabase
    .from('kafoolplus_members').select(cols)
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()

  // 2) first login → claim the pending row matched by email
  if (!member && user.email) {
    const { data: pending } = await supabase
      .from('kafoolplus_members').select(cols)
      .ilike('email', user.email).is('user_id', null).eq('is_active', true).maybeSingle()
    if (pending) {
      await supabase.from('kafoolplus_members').update({ user_id: user.id }).eq('id', pending.id)
      member = pending
    }
  }

  if (member) {
    return {
      role: member.role as KpRole,
      orgId: member.org_id,
      isSuperAdmin: ctx.isSuperAdmin,
      member: {
        id: member.id, role: member.role as KpRole,
        master_campaign_id: member.master_campaign_id,
        branch_id: member.branch_id, caller_group_id: member.caller_group_id,
      },
    }
  }

  // 3) implicit manager: org admins / super admins (scoped to the org in context)
  if (ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'manager') {
    return { role: 'manager', orgId: ctx.orgId, isSuperAdmin: ctx.isSuperAdmin, member: null }
  }

  return { role: null, orgId: ctx.orgId, isSuperAdmin: ctx.isSuperAdmin, member: null }
}
