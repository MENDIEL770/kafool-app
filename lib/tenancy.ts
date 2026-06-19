import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Sticky "current org" context for super admins. A regular user is always
// scoped to their own profile.org_id. A super admin defaults to GLOBAL
// (no org) and can "enter" an org — stored in the kf_org cookie — so every
// dashboard screen shows that org until they go back to the global overview.
export const ORG_COOKIE = 'kf_org'

export interface Context {
  orgId: string | null      // the org currently in scope (null = global, super-admin only)
  isSuperAdmin: boolean
  isGlobal: boolean          // super admin with no org selected
  role: string | null
  ownOrgId: string | null    // the user's own profile.org_id (for reference)
}

/**
 * Resolve the current org context on the server.
 * - regular user → their own org (cookie ignored)
 * - super admin  → the kf_org cookie value, or null (global overview)
 */
export async function getContext(supabase: SupabaseClient): Promise<Context> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { orgId: null, isSuperAdmin: false, isGlobal: false, role: null, ownOrgId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? null
  const ownOrgId = profile?.org_id ?? null

  if (role !== 'super_admin') {
    return { orgId: ownOrgId, isSuperAdmin: false, isGlobal: false, role, ownOrgId }
  }

  const cookieStore = await cookies()
  const ctxOrg = cookieStore.get(ORG_COOKIE)?.value || null
  return { orgId: ctxOrg, isSuperAdmin: true, isGlobal: !ctxOrg, role, ownOrgId }
}
