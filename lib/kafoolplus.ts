import type { SupabaseClient } from '@supabase/supabase-js'
import { getContext } from './tenancy'
import { createServiceClient } from './supabase/server'

// Kafool+ role/scope resolution. A member is identified by EMAIL: their
// kafoolplus_members row carries the role + scope (campaign/branch/group). On
// first login we claim the pending row (set user_id). Org admins / super admins
// act as implicit managers for the org currently in scope.
//
// Member lookups go through the SERVICE client because coordinators/callers may
// log in without a profile.org_id, which would otherwise block RLS reads of
// their own membership. All Kafool+ mutation APIs likewise use the service
// client + the scope checks below (manager/coordinator/caller), since RLS alone
// can't express the per-branch / per-group rules for these email-based users.

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
  userId: string | null
  member: KpMember | null   // null for an implicit manager (org admin/super admin)
}

const COLS = 'id, role, org_id, master_campaign_id, branch_id, caller_group_id'

export async function getKafoolPlusContext(supabase: SupabaseClient): Promise<KpContext> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, orgId: null, isSuperAdmin: false, userId: null, member: null }

  const ctx = await getContext(supabase)
  const admin = await createServiceClient()

  // 0) platform admins / super admins are ALWAYS managers — never demoted by a
  // stray coordinator/caller membership (e.g. if they used their own email).
  if (ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'manager') {
    return { role: 'manager', orgId: ctx.orgId, isSuperAdmin: ctx.isSuperAdmin, userId: user.id, member: null }
  }

  // 1) explicit membership by user_id
  let { data: member } = await admin
    .from('kafoolplus_members').select(COLS)
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()

  // 2) first login → claim the pending row matched by email
  if (!member && user.email) {
    const { data: pending } = await admin
      .from('kafoolplus_members').select(COLS)
      .ilike('email', user.email).is('user_id', null).eq('is_active', true).maybeSingle()
    if (pending) {
      await admin.from('kafoolplus_members').update({ user_id: user.id }).eq('id', pending.id)
      member = pending
    }
  }

  if (member) {
    return {
      role: member.role as KpRole,
      orgId: member.org_id,
      isSuperAdmin: ctx.isSuperAdmin,
      userId: user.id,
      member: {
        id: member.id, role: member.role as KpRole,
        master_campaign_id: member.master_campaign_id,
        branch_id: member.branch_id, caller_group_id: member.caller_group_id,
      },
    }
  }

  // 3) implicit manager: org admins / super admins (scoped to the org in context)
  if (ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'manager') {
    return { role: 'manager', orgId: ctx.orgId, isSuperAdmin: ctx.isSuperAdmin, userId: user.id, member: null }
  }

  return { role: null, orgId: ctx.orgId, isSuperAdmin: ctx.isSuperAdmin, userId: user.id, member: null }
}

/** A unique, slug-safe public_slug for a caller group. */
export function makeCallerSlug(name: string): string {
  const base = (name || 'caller')
    .toLowerCase().trim()
    .replace(/[^\w֐-׿]+/g, '-')   // keep latin/digits/hebrew, dash the rest
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'caller'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}
