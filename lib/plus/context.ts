import type { SupabaseClient } from '@supabase/supabase-js'
import { getContext } from '@/lib/tenancy'
import { createServiceClient } from '@/lib/supabase/server'

// Kafool+ telephony role/scope resolution (kp_members). Mirrors the legacy
// lib/kafoolplus.ts pattern: a member is identified by EMAIL; on first Google
// login we claim the pending row (set user_id). Org owners are implicit
// managers; super-admins are managers everywhere (god mode).
//
// All telephony data access goes through the SERVICE client + these scope
// checks, because coordinators/callers log in without a profile.org_id (which
// would otherwise block RLS reads of their own membership).

export type PlusRole = 'super_admin' | 'manager' | 'coordinator' | 'caller'

export interface PlusMember {
  id: string
  role: PlusRole
  campaign_id: string | null
  caller_group_id: string | null
}

export interface PlusContext {
  role: PlusRole | null
  orgId: string | null
  isSuperAdmin: boolean
  userId: string | null
  email: string | null
  member: PlusMember | null   // null for an implicit manager (org owner / super admin)
}

const COLS = 'id, role, organization_id, campaign_id, caller_group_id'

export async function getPlusContext(supabase: SupabaseClient): Promise<PlusContext> {
  const { data: { user } } = await supabase.auth.getUser()

  // ── LOCAL DEV ONLY: impersonate a Kafool+ member by email (no OAuth needed).
  // Guarded by NODE_ENV so it can NEVER run on a production build. Set
  // KP_DEV_EMAIL in .env.local to the member you want to develop as.
  if (!user && process.env.NODE_ENV === 'development' && process.env.KP_DEV_EMAIL) {
    const admin = await createServiceClient()
    const { data: m } = await admin.from('kp_members').select(COLS)
      .ilike('email', process.env.KP_DEV_EMAIL).eq('is_active', true).maybeSingle()
    if (m) {
      return {
        role: m.role as PlusRole, orgId: m.organization_id, isSuperAdmin: false,
        userId: `dev-${m.id}`, email: process.env.KP_DEV_EMAIL,
        member: { id: m.id, role: m.role as PlusRole, campaign_id: m.campaign_id, caller_group_id: m.caller_group_id },
      }
    }
  }

  if (!user) return { role: null, orgId: null, isSuperAdmin: false, userId: null, email: null, member: null }

  const ctx = await getContext(supabase)
  const admin = await createServiceClient()
  const base = { isSuperAdmin: ctx.isSuperAdmin, userId: user.id, email: user.email ?? null }

  // 0) super admins are always managers (god mode)
  if (ctx.isSuperAdmin) {
    return { role: 'manager', orgId: ctx.orgId, member: null, ...base }
  }

  // 1) explicit membership by user_id (an account may have >1 row — pick one;
  // maybeSingle() would THROW on multiple and crash the whole module)
  const { data: byUser } = await admin
    .from('kp_members').select(COLS)
    .eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(1)
  let member = (byUser ?? [])[0] ?? null

  // 2) first login → claim the pending row matched by email
  if (!member && user.email) {
    const { data: pendings } = await admin
      .from('kp_members').select(COLS)
      .ilike('email', user.email).is('user_id', null).eq('is_active', true).order('created_at', { ascending: true }).limit(1)
    const pending = (pendings ?? [])[0]
    if (pending) {
      await admin.from('kp_members').update({ user_id: user.id }).eq('id', pending.id)
      member = pending
    }
  }

  if (member) {
    return {
      role: member.role as PlusRole,
      orgId: member.organization_id,
      member: {
        id: member.id, role: member.role as PlusRole,
        campaign_id: member.campaign_id, caller_group_id: member.caller_group_id,
      },
      ...base,
    }
  }

  // 3) implicit manager: the actual OWNER of an org (organizations.owner_id),
  // not profiles.role (the signup trigger makes every account 'admin').
  // (limit(1) — a user could own >1 org; maybeSingle would throw)
  const { data: ownedOrgs } = await admin
    .from('organizations').select('id').eq('owner_id', user.id).limit(1)
  const ownedOrg = (ownedOrgs ?? [])[0]
  if (ownedOrg) {
    return { role: 'manager', orgId: ctx.orgId ?? ownedOrg.id, member: null, ...base }
  }

  return { role: null, orgId: ctx.orgId, member: null, ...base }
}

/** Unique, slug-safe public_slug for a caller group. */
export function makePlusSlug(name: string): string {
  const base = (name || 'caller')
    .toLowerCase().trim()
    .replace(/[^\w֐-׿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'caller'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/** Recursive descendant campaign ids (telephony hierarchy), for manager/coordinator scope. */
export function descendantCampaignIds(
  campaigns: { id: string; parent_campaign_id: string | null }[],
  rootId: string,
): string[] {
  const ids = [rootId]
  for (const c of campaigns.filter(c => c.parent_campaign_id === rootId)) {
    ids.push(...descendantCampaignIds(campaigns, c.id))
  }
  return ids
}
