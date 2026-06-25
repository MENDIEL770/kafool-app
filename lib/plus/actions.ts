'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlusContext, makePlusSlug } from './context'
import { loadPlusData } from './data'
import { sendPlusEmail } from '@/lib/email'
import type { Lead, LeadStatus, CallerGroup, CampaignBranding, Role, Reminder } from './types'

// ─── join requests (for logged-in users who aren't members yet) ───
export interface JoinableCampaign { id: string; name: string; orgId: string; branches: { id: string; name: string }[] }

/** Campaigns (+ their branches) a new user can request to join — orgs subscribed to Kafool+. */
export async function listJoinable(): Promise<JoinableCampaign[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const admin = await createServiceClient()
  const { data: orgs } = await admin.from('organizations').select('id').eq('has_kafool_plus', true)
  const orgIds = (orgs ?? []).map(o => o.id)
  if (!orgIds.length) return []
  const { data: camps } = await admin.from('kp_campaigns').select('id, name, organization_id, parent_campaign_id').in('organization_id', orgIds)
  const all = camps ?? []
  return all.filter(c => !c.parent_campaign_id).map(m => ({
    id: m.id as string, name: m.name as string, orgId: m.organization_id as string,
    branches: all.filter(c => c.parent_campaign_id === m.id).map(b => ({ id: b.id as string, name: b.name as string })),
  }))
}

/** Is there a pending join request for the current user? */
export async function myPendingRequest(): Promise<{ campaignName: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const admin = await createServiceClient()
  const { data } = await admin.from('kp_members').select('campaign_id').ilike('email', user.email).eq('status', 'pending').maybeSingle()
  if (!data) return null
  const { data: c } = await admin.from('kp_campaigns').select('name').eq('id', data.campaign_id).maybeSingle()
  return { campaignName: (c?.name as string) ?? '' }
}

/** Submit a join request to a branch → pending member + notify the manager & coordinator. */
export async function requestJoinBranch(branchId: string): Promise<{ ok: boolean; already?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('יש להתחבר')
  const admin = await createServiceClient()
  const { data: branch } = await admin.from('kp_campaigns')
    .select('id, name, organization_id, parent_campaign_id, coordinator_email').eq('id', branchId).maybeSingle()
  if (!branch) throw new Error('סניף לא נמצא')

  const { data: existing } = await admin.from('kp_members').select('id').ilike('email', user.email).eq('campaign_id', branchId).maybeSingle()
  if (existing) return { ok: true, already: true }

  await admin.from('kp_members').insert({
    organization_id: branch.organization_id, email: user.email.toLowerCase(), user_id: user.id,
    role: 'caller', campaign_id: branchId, status: 'pending', is_active: false,
  })

  // collect recipients: branch coordinator(s) + master-campaign manager(s) + org owner
  const to = new Set<string>()
  if (branch.coordinator_email) to.add(branch.coordinator_email as string)
  const { data: coords } = await admin.from('kp_members').select('email').eq('campaign_id', branchId).eq('role', 'coordinator')
  for (const c of coords ?? []) if (c.email) to.add((c.email as string))
  if (branch.parent_campaign_id) {
    const { data: mgrs } = await admin.from('kp_members').select('email').eq('campaign_id', branch.parent_campaign_id).eq('role', 'manager')
    for (const m of mgrs ?? []) if (m.email) to.add((m.email as string))
  }
  try {
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', branch.organization_id).maybeSingle()
    if (org?.owner_id) { const { data: p } = await admin.from('profiles').select('email').eq('id', org.owner_id).maybeSingle(); if (p?.email) to.add(p.email as string) }
  } catch { /* profiles.email optional */ }

  const subject = `בקשת הצטרפות חדשה — ${branch.name}`
  const html = `המשתמש <b>${user.email}</b> ביקש להצטרף כטלפן לסניף <b>${branch.name}</b>.<br/>היכנס ל-Kafool+ ואשר/דחה את הבקשה במסך "הרשאות" (מנהל) או אצל הרכז.`
  for (const addr of to) { try { await sendPlusEmail(addr, subject, html) } catch { /* best-effort */ } }
  return { ok: true }
}

// All telephony mutations. Same signatures as the old zustand store so the
// ported screens call them almost unchanged. Each guards on the caller's
// role/org via getPlusContext, then writes with the service client.

async function ctx() {
  const supabase = await createClient()
  const c = await getPlusContext(supabase)
  if (!c.role || !c.orgId) throw new Error('Kafool+: no access')
  return c
}
function assertManagerial(role: string | null) {
  if (!role || !['super_admin', 'manager', 'coordinator'].includes(role)) throw new Error('Kafool+: insufficient role')
}
const now = () => new Date().toISOString()

/** Reload the scoped dataset (after a mutation, the screens refetch this). */
export async function fetchPlusData() {
  return loadPlusData(await ctx())
}

// ─── members ───
export async function requestJoin(email: string, campaignId: string, role: Role) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = await createServiceClient()
  const { data: camp } = await admin.from('kp_campaigns').select('organization_id').eq('id', campaignId).maybeSingle()
  if (!camp) throw new Error('Kafool+: campaign not found')
  await admin.from('kp_members').insert({
    organization_id: camp.organization_id, email: email.trim().toLowerCase(),
    user_id: user?.id ?? null, role, campaign_id: campaignId, status: 'pending', is_active: false,
  })
}

export async function approveMember(memberId: string, role: Role, campaignId: string | null, callerGroupId: string | null) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_members').update({
    status: 'active', is_active: true, role, campaign_id: campaignId, caller_group_id: callerGroupId, updated_at: now(),
  }).eq('id', memberId).eq('organization_id', c.orgId!)
}

export async function addMember(id: string, m: { email: string; role: Role; campaign_id?: string | null; caller_group_id?: string | null; status?: string; is_active?: boolean }) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_members').insert({
    id, organization_id: c.orgId!, email: m.email.trim().toLowerCase(), role: m.role,
    campaign_id: m.campaign_id ?? null, caller_group_id: m.caller_group_id ?? null,
    status: m.status ?? 'active', is_active: m.is_active ?? true,
  })
}

export async function rejectMember(memberId: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_members').update({ status: 'rejected', is_active: false, updated_at: now() })
    .eq('id', memberId).eq('organization_id', c.orgId!)
}

/** Manager pastes emails → active callers in the campaign pool (no branch yet). */
export async function addEmailPool(campaignId: string, emails: string[]): Promise<{ added: number; skipped: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const clean = Array.from(new Set(emails.map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))))
  const { data: existing } = await admin.from('kp_members').select('email').eq('organization_id', c.orgId!)
  const have = new Set((existing ?? []).map(m => (m.email as string).toLowerCase()))
  const toAdd = clean.filter(e => !have.has(e)).map(email => ({
    organization_id: c.orgId!, email, role: 'caller' as const, campaign_id: campaignId,
    caller_group_id: null, status: 'active' as const, is_active: true,
  }))
  if (toAdd.length) await admin.from('kp_members').insert(toAdd)
  return { added: toAdd.length, skipped: clean.length - toAdd.length }
}

export async function approveToPool(memberId: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_members').update({ status: 'active', is_active: true, role: 'caller', caller_group_id: null, updated_at: now() })
    .eq('id', memberId).eq('organization_id', c.orgId!)
}

/** Coordinator pulls a pool member into THEIR branch as a caller (creates a group). */
export async function assignFromPool(id: string, memberId: string, branchCampaignId: string, displayName: string, link: string, goal: number, phone?: string): Promise<string> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: member } = await admin.from('kp_members').select('email').eq('id', memberId).maybeSingle()
  await admin.from('kp_caller_groups').insert({
    id, organization_id: c.orgId!, campaign_id: branchCampaignId,
    caller_email: member?.email ?? '', display_name: displayName || (member?.email as string) || 'טלפן',
    public_slug: makePlusSlug(displayName || 'caller'), donation_link: link, personal_goal: goal, phone: phone ?? null,
  })
  await admin.from('kp_members').update({
    campaign_id: branchCampaignId, caller_group_id: id, role: 'caller', status: 'active', is_active: true, updated_at: now(),
  }).eq('id', memberId).eq('organization_id', c.orgId!)
  return id
}

// ─── campaigns ───
/** Create a top-level (master) campaign for the org, with its style. */
export async function addMasterCampaign(id: string, name: string, goal: number, style: 'hierarchical' | 'flat' = 'hierarchical'): Promise<string> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_campaigns').insert({
    id, organization_id: c.orgId!, parent_campaign_id: null, name, goal_amount: goal, style,
  })
  return id
}

/** Change a campaign's style (manager / super-admin). */
export async function updateCampaignStyle(campaignId: string, style: 'hierarchical' | 'flat') {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_campaigns').update({ style, updated_at: now() }).eq('id', campaignId).eq('organization_id', c.orgId!)
}

// Manager edits a branch + its coordinator (name, coordinator email, goal).
// Keeps the coordinator kp_member in sync; resetting user_id when the email
// changes so the new coordinator claims the row on their next Google login.
export async function updateBranchCoordinator(branchId: string, patch: { name?: string; email?: string; goal?: number }) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: branch } = await admin.from('kp_campaigns')
    .select('coordinator_email').eq('id', branchId).eq('organization_id', c.orgId!).maybeSingle()
  if (!branch) throw new Error('Kafool+: הסניף לא נמצא')
  const oldEmail = (branch.coordinator_email as string | null ?? '').trim().toLowerCase()
  const newEmail = patch.email !== undefined ? patch.email.trim().toLowerCase() : undefined

  const upd: Record<string, unknown> = { updated_at: now() }
  if (patch.name?.trim()) upd.name = patch.name.trim()
  if (patch.goal !== undefined) upd.goal_amount = patch.goal
  if (newEmail !== undefined) upd.coordinator_email = newEmail || null
  await admin.from('kp_campaigns').update(upd).eq('id', branchId).eq('organization_id', c.orgId!)

  if (newEmail !== undefined && newEmail !== oldEmail) {
    const { data: mem } = await admin.from('kp_members').select('id')
      .eq('organization_id', c.orgId!).eq('campaign_id', branchId).eq('role', 'coordinator').maybeSingle()
    if (newEmail) {
      if (mem) await admin.from('kp_members').update({ email: newEmail, user_id: null, status: 'active', is_active: true, updated_at: now() }).eq('id', mem.id)
      else await admin.from('kp_members').insert({ organization_id: c.orgId!, email: newEmail, role: 'coordinator', campaign_id: branchId, status: 'active', is_active: true })
    } else if (mem) {
      await admin.from('kp_members').delete().eq('id', mem.id)
    }
  }
}

// Move a branch's coordinator to a different branch (reassign).
export async function reassignCoordinator(fromBranchId: string, toBranchId: string) {
  const c = await ctx(); assertManagerial(c.role)
  if (fromBranchId === toBranchId) return
  const admin = await createServiceClient()
  const { data: from } = await admin.from('kp_campaigns')
    .select('coordinator_email').eq('id', fromBranchId).eq('organization_id', c.orgId!).maybeSingle()
  const email = (from?.coordinator_email as string | null ?? '').trim().toLowerCase()
  if (!email) throw new Error('Kafool+: לסניף הזה אין רכז להעביר')
  const { data: mem } = await admin.from('kp_members').select('id')
    .eq('organization_id', c.orgId!).eq('campaign_id', fromBranchId).eq('role', 'coordinator').maybeSingle()
  if (mem) await admin.from('kp_members').update({ campaign_id: toBranchId, updated_at: now() }).eq('id', mem.id)
  await admin.from('kp_campaigns').update({ coordinator_email: null, updated_at: now() }).eq('id', fromBranchId).eq('organization_id', c.orgId!)
  await admin.from('kp_campaigns').update({ coordinator_email: email, updated_at: now() }).eq('id', toBranchId).eq('organization_id', c.orgId!)
}

// Manager renames the campaign — keeps the displayed name (header/branding) in sync.
export async function renameCampaign(campaignId: string, name: string) {
  const c = await ctx(); assertManagerial(c.role)
  const nm = name.trim()
  if (!nm) return
  const admin = await createServiceClient()
  await admin.from('kp_campaigns').update({ name: nm, updated_at: now() }).eq('id', campaignId).eq('organization_id', c.orgId!)
  const { data: br } = await admin.from('kp_campaign_branding').select('id').eq('campaign_id', campaignId).maybeSingle()
  if (br) await admin.from('kp_campaign_branding').update({ campaign_name: nm, updated_at: now() }).eq('id', br.id)
  else await admin.from('kp_campaign_branding').insert({ organization_id: c.orgId!, campaign_id: campaignId, campaign_name: nm })
}

export async function addSubCampaign(id: string, parentId: string, name: string, coordEmail: string, goal: number): Promise<string> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_campaigns').insert({
    id, organization_id: c.orgId!, parent_campaign_id: parentId, name, goal_amount: goal, style: 'hierarchical',
    coordinator_email: coordEmail || null,
  })
  if (coordEmail) {
    await admin.from('kp_members').insert({
      organization_id: c.orgId!, email: coordEmail.trim().toLowerCase(), role: 'coordinator',
      campaign_id: id, status: 'active', is_active: true,
    })
  }
  return id
}

// ─── caller groups ───
export async function addCallerGroup(id: string, campaignId: string, email: string, name: string, link: string, goal: number, phone?: string): Promise<string> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_caller_groups').insert({
    id, organization_id: c.orgId!, campaign_id: campaignId, caller_email: email,
    display_name: name, public_slug: makePlusSlug(name), donation_link: link, personal_goal: goal, phone: phone ?? null,
  })
  if (email) {
    const { data: existing } = await admin.from('kp_members').select('id')
      .ilike('email', email).eq('campaign_id', campaignId).maybeSingle()
    if (existing) {
      await admin.from('kp_members').update({ caller_group_id: id, updated_at: now() }).eq('id', existing.id)
    } else {
      await admin.from('kp_members').insert({
        organization_id: c.orgId!, email: email.trim().toLowerCase(), role: 'caller',
        campaign_id: campaignId, caller_group_id: id, status: 'active', is_active: true,
      })
    }
  }
  return id
}

/** Ensure a coordinator has a personal caller group so they can work as a caller. */
export async function ensureCallerGroupFor(id: string, campaignId: string, email: string, name: string): Promise<string> {
  const c = await ctx()
  const admin = await createServiceClient()
  const { data: existing } = await admin.from('kp_caller_groups').select('id')
    .eq('campaign_id', campaignId).ilike('caller_email', email).maybeSingle()
  if (existing) return existing.id as string
  await admin.from('kp_caller_groups').insert({
    id, organization_id: c.orgId!, campaign_id: campaignId, caller_email: email,
    display_name: name, public_slug: makePlusSlug(name || 'coord-caller'), donation_link: '', personal_goal: 0, is_coordinator: true,
  })
  return id
}

export async function updateCallerGroup(id: string, patch: Partial<CallerGroup>) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const full: Record<string, unknown> = { ...patch, updated_at: now() }
  // When the Charidy link is set/changed, resolve its numeric team id so the
  // donation webhook can map incoming donations back to this caller group.
  if (typeof patch.donation_link === 'string' && patch.charidy_team_id === undefined) {
    const { resolveCharidyTeamId } = await import('./charidyResolve')
    full.charidy_team_id = await resolveCharidyTeamId(patch.donation_link)
  }
  await admin.from('kp_caller_groups').update(full).eq('id', id).eq('organization_id', c.orgId!)
}

// Manager/coordinator one-click: fill charidy_team_id for any group that has a
// Charidy link but no resolved team id yet (e.g. links saved before this feature).
export async function backfillCharidyTeamIds(): Promise<{ resolved: number; total: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { resolveCharidyTeamId } = await import('./charidyResolve')
  const { data } = await admin.from('kp_caller_groups')
    .select('id, donation_link, charidy_team_id').eq('organization_id', c.orgId!)
  const todo = (data ?? []).filter(g => g.donation_link && !g.charidy_team_id)
  let resolved = 0
  for (const g of todo) {
    const tid = await resolveCharidyTeamId(g.donation_link as string)
    if (tid) { await admin.from('kp_caller_groups').update({ charidy_team_id: tid, updated_at: now() }).eq('id', g.id); resolved++ }
  }
  return { resolved, total: todo.length }
}

export async function removeCallerGroup(id: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_caller_groups').delete().eq('id', id).eq('organization_id', c.orgId!)
}

// ─── leads ───

// The first segment of an ambassador cell ("שם | לזכות..." → "שם").
function firstAmbassador(raw: unknown): string {
  return String(raw ?? '').split('|')[0].replace(/\s+/g, ' ').trim()
}

/**
 * Resolve a set of ambassador names to caller-group ids within a campaign,
 * creating a group for each new ambassador (no login email yet — display only).
 * Returns a map keyed by normalized name. Reuses existing groups by name.
 */
async function resolveAmbassadorGroups(
  admin: Awaited<ReturnType<typeof createServiceClient>>, orgId: string, campaignId: string, names: Set<string>,
): Promise<{ map: Map<string, string>; created: number }> {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const map = new Map<string, string>()
  if (names.size === 0) return { map, created: 0 }
  const { data: existing } = await admin.from('kp_caller_groups')
    .select('id, display_name').eq('organization_id', orgId).eq('campaign_id', campaignId)
  for (const g of existing ?? []) map.set(norm(g.display_name as string), g.id as string)
  let created = 0
  const toInsert: Record<string, unknown>[] = []
  for (const name of names) {
    const k = norm(name)
    if (!k || map.has(k)) continue
    const id = crypto.randomUUID()
    map.set(k, id)
    toInsert.push({
      id, organization_id: orgId, campaign_id: campaignId, caller_email: '',
      display_name: name, public_slug: makePlusSlug(name), donation_link: '', personal_goal: 0,
    })
    created++
  }
  if (toInsert.length) await admin.from('kp_caller_groups').insert(toInsert)
  return { map, created }
}

export async function importLeads(campaignId: string, rows: Partial<Lead>[]): Promise<{ added: number; duplicates: number; review: number; callers: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: existing } = await admin.from('kp_leads').select('phone').eq('campaign_id', campaignId)
  const seen = new Set((existing ?? []).map(l => (l.phone as string).replace(/\D/g, '')))

  // ambassador (שגריר) → a caller group per ambassador; their leads get assigned to it
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const ambNames = new Set<string>()
  for (const r of rows) { const a = firstAmbassador(r.ambassador_note); if (a) ambNames.add(a) }
  const { map: ambGroups, created: callers } = await resolveAmbassadorGroups(admin, c.orgId!, campaignId, ambNames)

  let added = 0, duplicates = 0, review = 0
  const toAdd: Record<string, unknown>[] = []
  for (const r of rows) {
    const phoneRaw = (r.phone ?? '').toString()
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits && seen.has(digits)) { duplicates++; continue }
    if (digits) seen.add(digits)
    const invalid = !/^0?5\d{8}$/.test(digits) && !/^0\d{8,9}$/.test(digits)
    if (invalid) review++
    const amb = firstAmbassador(r.ambassador_note)
    toAdd.push({
      organization_id: c.orgId!, campaign_id: campaignId, full_name: r.full_name ?? 'ללא שם', phone: phoneRaw,
      email: r.email ?? null, address: r.address ?? null, birthday: r.birthday ?? null, notes: r.notes ?? null,
      status: 'new', is_vip: r.is_vip ?? false, needs_review: invalid,
      donation_history: r.donation_history ?? [], ambassador_note: r.ambassador_note ?? null,
      assigned_caller_group_id: amb ? (ambGroups.get(norm(amb)) ?? null) : null,
      import_source: 'excel', custom_fields: r.custom_fields ?? {},
    })
    added++
  }
  if (toAdd.length) await admin.from('kp_leads').insert(toAdd)
  return { added, duplicates, review, callers }
}

/**
 * Manager bulk import: one Excel with a 'branch' column. Creates each branch
 * (kp_campaign under root), its coordinator account (by email), and the leads
 * with donation history — grouped per branch, deduped by phone.
 */
export async function importBranchLeads(rootId: string, rows: {
  branch: string; coordEmail?: string; full_name: string; phone: string;
  email?: string; address?: string; notes?: string; ambassador?: string; history?: { date: string; amount: number }[];
}[]): Promise<{ branches: number; coordinators: number; leads: number; duplicates: number; callers: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const norm = (s: string) => (s || '').replace(/\s+/g, '').trim()
  const normName = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase()

  const { data: existingBranches } = await admin.from('kp_campaigns')
    .select('id, name').eq('organization_id', c.orgId!).eq('parent_campaign_id', rootId)
  const branchByName = new Map<string, string>((existingBranches ?? []).map(b => [norm(b.name as string), b.id as string]))

  const byBranch = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = (r.branch || '').trim() || 'כללי'
    if (!byBranch.has(k)) byBranch.set(k, [])
    byBranch.get(k)!.push(r)
  }

  let branches = 0, coordinators = 0, leads = 0, duplicates = 0, callers = 0
  for (const [branchName, brRows] of byBranch) {
    let branchId = branchByName.get(norm(branchName))
    const coordEmail = brRows.find(r => r.coordEmail)?.coordEmail?.trim().toLowerCase()
    if (!branchId) {
      branchId = crypto.randomUUID()
      await admin.from('kp_campaigns').insert({
        id: branchId, organization_id: c.orgId!, parent_campaign_id: rootId,
        name: branchName, style: 'hierarchical', goal_amount: 0, coordinator_email: coordEmail ?? null,
      })
      branchByName.set(norm(branchName), branchId)
      branches++
    }
    if (coordEmail) {
      const { data: existingMember } = await admin.from('kp_members')
        .select('id').eq('organization_id', c.orgId!).ilike('email', coordEmail).maybeSingle()
      if (!existingMember) {
        await admin.from('kp_members').insert({
          organization_id: c.orgId!, email: coordEmail, role: 'coordinator',
          campaign_id: branchId, status: 'active', is_active: true,
        })
        coordinators++
      } else {
        await admin.from('kp_members').update({ role: 'coordinator', campaign_id: branchId, status: 'active', is_active: true })
          .eq('id', existingMember.id)
      }
    }
    // ambassador (שגריר) → caller group per ambassador within this branch
    const ambNames = new Set<string>()
    for (const r of brRows) { const a = firstAmbassador(r.ambassador); if (a) ambNames.add(a) }
    const { map: ambGroups, created } = await resolveAmbassadorGroups(admin, c.orgId!, branchId, ambNames)
    callers += created

    const { data: existingLeads } = await admin.from('kp_leads').select('phone').eq('campaign_id', branchId)
    const seen = new Set((existingLeads ?? []).map(l => (l.phone as string).replace(/\D/g, '')))
    const toInsert: Record<string, unknown>[] = []
    for (const r of brRows) {
      const digits = (r.phone || '').replace(/\D/g, '')
      if (digits && seen.has(digits)) { duplicates++; continue }
      if (digits) seen.add(digits)
      const amb = firstAmbassador(r.ambassador)
      toInsert.push({
        organization_id: c.orgId!, campaign_id: branchId, full_name: r.full_name || 'ללא שם',
        phone: r.phone || '', email: r.email ?? null, address: r.address ?? null, notes: r.notes ?? null,
        status: 'new', donation_history: r.history ?? [], import_source: 'excel',
        ambassador_note: r.ambassador || null,
        assigned_caller_group_id: amb ? (ambGroups.get(normName(amb)) ?? null) : null,
      })
    }
    if (toInsert.length) { await admin.from('kp_leads').insert(toInsert); leads += toInsert.length }
  }
  return { branches, coordinators, leads, duplicates, callers }
}

/**
 * Import branch coordinators from a (name, branch, email) list. Matches each to
 * existing branches by fuzzy name (ignores בנות/בנים, punctuation), sets the
 * coordinator and creates their kp_member. Creates the branch if none matches.
 */
export async function importCoordinators(rootId: string, rows: { name?: string; branch: string; email: string }[]):
  Promise<{ assigned: number; created: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: branches } = await admin.from('kp_campaigns').select('id, name').eq('organization_id', c.orgId!).eq('parent_campaign_id', rootId)
  const list = (branches ?? []).map(b => ({ id: b.id as string, name: b.name as string }))
  const norm = (s: string) => (s || '').toLowerCase().replace(/[.,'"`׳״\-_/()]/g, '').replace(/בנות|בנים/g, '').replace(/\s+/g, '').trim()
  let assigned = 0, created = 0
  for (const r of rows) {
    const bn = norm(r.branch); const email = (r.email || '').trim().toLowerCase()
    if (!bn || !/.+@.+\..+/.test(email)) continue
    let targets = list.filter(b => { const nb = norm(b.name); return nb && (nb.includes(bn) || bn.includes(nb)) })
    if (!targets.length) {
      const id = crypto.randomUUID()
      await admin.from('kp_campaigns').insert({ id, organization_id: c.orgId!, parent_campaign_id: rootId, name: r.branch, style: 'hierarchical', goal_amount: 0, coordinator_email: email })
      list.push({ id, name: r.branch }); targets = [{ id, name: r.branch }]; created++
    }
    for (const b of targets) {
      await admin.from('kp_campaigns').update({ coordinator_email: email }).eq('id', b.id)
      const { data: existing } = await admin.from('kp_members').select('id').eq('organization_id', c.orgId!).ilike('email', email).eq('campaign_id', b.id).maybeSingle()
      if (!existing) await admin.from('kp_members').insert({ organization_id: c.orgId!, email, role: 'coordinator', campaign_id: b.id, status: 'active', is_active: true })
      else await admin.from('kp_members').update({ role: 'coordinator', status: 'active', is_active: true }).eq('id', existing.id)
      assigned++
    }
  }
  return { assigned, created }
}

export async function setCallDecision(leadId: string, decision: 'yes' | 'no') {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kp_leads').select('custom_fields').eq('id', leadId).maybeSingle()
  const cf = { ...(lead?.custom_fields as Record<string, unknown> ?? {}), call_decision: decision }
  await admin.from('kp_leads').update({ custom_fields: cf, updated_at: now() }).eq('id', leadId).eq('organization_id', c.orgId!)
}

// Caller triage: a caller swipes their OWN leads (or a managerial user any lead).
export async function setCallDecisionOwn(leadId: string, decision: 'yes' | 'no') {
  const c = await ctx()
  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kp_leads').select('custom_fields, assigned_caller_group_id, organization_id').eq('id', leadId).maybeSingle()
  if (!lead || lead.organization_id !== c.orgId) throw new Error('Kafool+: lead not found')
  const isOwner = !!c.member?.caller_group_id && lead.assigned_caller_group_id === c.member.caller_group_id
  if (!isOwner && !['super_admin', 'manager', 'coordinator'].includes(c.role!)) throw new Error('אין הרשאה')
  const cf = { ...(lead.custom_fields as Record<string, unknown> ?? {}), call_decision: decision }
  await admin.from('kp_leads').update({ custom_fields: cf, updated_at: now() }).eq('id', leadId)
}

// Caller imports their own contacts (file or phone) into their group. Marked for
// triage so they swipe who to call before the contacts enter the call queue.
// normalize an Israeli phone to its last 9 local digits — so 0xx / +972xx /
// spaced variants of the same number dedupe to one.
function phoneKey(phone: string): string {
  let d = (phone ?? '').replace(/\D/g, '')
  if (d.startsWith('972')) d = d.slice(3)
  return d.slice(-9)
}

export async function importCallerContacts(rows: { full_name: string; phone: string; email?: string; notes?: string }[]): Promise<{ added: number; duplicates: number; noPhone: number; overseas: number }> {
  const { isIsraeliPhone } = await import('./phone')
  const c = await ctx()
  const cgId = c.member?.caller_group_id
  if (!cgId) throw new Error('Kafool+: אין לך קבוצת טלפן')
  const admin = await createServiceClient()
  const { data: cg } = await admin.from('kp_caller_groups').select('campaign_id, organization_id').eq('id', cgId).maybeSingle()
  if (!cg || cg.organization_id !== c.orgId) throw new Error('Kafool+: קבוצה לא נמצאה')
  const { data: existing } = await admin.from('kp_leads').select('phone').eq('assigned_caller_group_id', cgId)
  const seen = new Set((existing ?? []).map(l => phoneKey(l.phone as string)).filter(k => k.length >= 7))
  let added = 0, duplicates = 0, noPhone = 0, overseas = 0
  const toAdd: Record<string, unknown>[] = []
  for (const r of rows) {
    const phoneRaw = (r.phone ?? '').toString().trim()
    const key = phoneKey(phoneRaw)
    if (key.length < 7) { noPhone++; continue }          // no usable number → skip + report
    if (seen.has(key)) { duplicates++; continue }         // merge duplicates (0xx == +972xx)
    seen.add(key)
    const isOverseas = !isIsraeliPhone(phoneRaw)
    if (isOverseas) overseas++
    toAdd.push({
      organization_id: cg.organization_id, campaign_id: cg.campaign_id, assigned_caller_group_id: cgId,
      full_name: (r.full_name ?? '').trim() || 'ללא שם', phone: phoneRaw, email: r.email ?? null,
      notes: r.notes ?? null,
      status: 'new', import_source: 'contacts', custom_fields: { needs_triage: true, overseas: isOverseas },
    })
    added++
  }
  if (toAdd.length) await admin.from('kp_leads').insert(toAdd)
  return { added, duplicates, noPhone, overseas }
}

// Clean a caller's leads: merge phone duplicates (keeping the most-progressed
// record) and remove un-callable leads with no phone number. Calls/promises of a
// removed duplicate cascade away — we always keep the row that has progress.
export async function dedupeMyLeads(): Promise<{ merged: number; noPhoneRemoved: number }> {
  const c = await ctx()
  const cgId = c.member?.caller_group_id
  if (!cgId) throw new Error('Kafool+: אין לך קבוצת טלפן')
  const admin = await createServiceClient()
  const { data: leads } = await admin.from('kp_leads')
    .select('id, phone, full_name, status, donation_history, created_at')
    .eq('assigned_caller_group_id', cgId).order('created_at', { ascending: true })
  const rank = (s: string) => ['donated', 'promised', 'callback'].includes(s) ? 2 : s === 'new' ? 0 : 1
  const score = (l: Record<string, unknown>) => rank(l.status as string) * 10
    + (Array.isArray(l.donation_history) && (l.donation_history as unknown[]).length ? 2 : 0)
    + ((l.full_name as string) && l.full_name !== 'ללא שם' ? 1 : 0)
  const byKey = new Map<string, Record<string, unknown>>()
  const toDelete: string[] = []
  let noPhoneRemoved = 0
  for (const l of (leads ?? []) as Record<string, unknown>[]) {
    const key = phoneKey(l.phone as string)
    if (key.length < 7) { toDelete.push(l.id as string); noPhoneRemoved++; continue }
    const prev = byKey.get(key)
    if (!prev) { byKey.set(key, l); continue }
    // keep the better-scoring of the two; drop the other
    if (score(l) > score(prev)) { toDelete.push(prev.id as string); byKey.set(key, l) }
    else { toDelete.push(l.id as string) }
  }
  const merged = toDelete.length - noPhoneRemoved
  if (toDelete.length) {
    // delete in chunks to stay under URL limits
    for (let i = 0; i < toDelete.length; i += 100) {
      await admin.from('kp_leads').delete().in('id', toDelete.slice(i, i + 100))
    }
  }
  return { merged, noPhoneRemoved }
}

// Caller saves their OWN Charidy group link (manager-only updateCallerGroup would
// reject them). Auto-resolves the numeric team id for donation→caller matching.
export async function saveMyCallerLink(link: string): Promise<{ ok: boolean; teamId: string | null }> {
  const c = await ctx()
  const cgId = c.member?.caller_group_id
  if (!cgId) throw new Error('Kafool+: אין לך קבוצת טלפן')
  const admin = await createServiceClient()
  const { resolveCharidyTeamId } = await import('./charidyResolve')
  const teamId = await resolveCharidyTeamId(link)
  await admin.from('kp_caller_groups').update({ donation_link: link.trim(), charidy_team_id: teamId, updated_at: now() })
    .eq('id', cgId).eq('organization_id', c.orgId!)
  return { ok: true, teamId }
}

// Coordinator/manager: the branch's Charidy CAMPAIGN link — used to pull the list
// of teams so callers' group links can be picked from it.
export async function setCampaignCharidyLink(campaignId: string, link: string, donateUrl?: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const upd: Record<string, unknown> = { charidy_campaign_link: link.trim() || null, updated_at: now() }
  if (donateUrl !== undefined) upd.charidy_donate_url = donateUrl.trim() || null
  await admin.from('kp_campaigns').update(upd).eq('id', campaignId).eq('organization_id', c.orgId!)
}

// List the teams of a Charidy campaign (for the coordinator's group picker).
export async function listCharidyTeamsForLink(campaignLink: string) {
  await ctx()
  const { listCharidyTeams } = await import('./charidyResolve')
  return listCharidyTeams(campaignLink)
}

export async function assignLeadsEvenly(campaignId: string, callerGroupIds: string[]) {
  const c = await ctx(); assertManagerial(c.role)
  if (callerGroupIds.length === 0) return
  const admin = await createServiceClient()
  const { data: pool } = await admin.from('kp_leads').select('id, custom_fields')
    .eq('campaign_id', campaignId).is('assigned_caller_group_id', null)
  const eligible = (pool ?? []).filter(l => (l.custom_fields as { call_decision?: string } ?? {}).call_decision !== 'no')
  let i = 0
  for (const l of eligible) {
    const cg = callerGroupIds[i % callerGroupIds.length]; i++
    await admin.from('kp_leads').update({ assigned_caller_group_id: cg, updated_at: now() }).eq('id', l.id)
  }
}

export async function assignLead(leadId: string, callerGroupId: string | null) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_leads').update({ assigned_caller_group_id: callerGroupId, updated_at: now() })
    .eq('id', leadId).eq('organization_id', c.orgId!)
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_leads').update({ ...patch, updated_at: now() }).eq('id', id).eq('organization_id', c.orgId!)
}

export async function deleteLead(id: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_leads').delete().eq('id', id).eq('organization_id', c.orgId!)
}

export async function setLeadStatus(id: string, status: LeadStatus) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_leads').update({ status, updated_at: now() }).eq('id', id).eq('organization_id', c.orgId!)
}

// ─── calls / promises / reminders ───
export async function logCall(leadId: string, callerGroupId: string, outcome: LeadStatus, notes?: string) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_calls').insert({
    organization_id: c.orgId!, lead_id: leadId, caller_group_id: callerGroupId, outcome, notes: notes ?? null,
  })
  const patch: Record<string, unknown> = { status: outcome, updated_at: now() }
  if (notes) patch.notes = notes
  await admin.from('kp_leads').update(patch).eq('id', leadId).eq('organization_id', c.orgId!)
}

export async function addPromise(leadId: string, callerGroupId: string, amount: number, dueDate?: string) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_promises').insert({
    organization_id: c.orgId!, lead_id: leadId, caller_group_id: callerGroupId, amount, status: 'open', due_date: dueDate ?? null,
  })
  await admin.from('kp_leads').update({ status: 'promised', updated_at: now() }).eq('id', leadId).eq('organization_id', c.orgId!)
}

export async function addReminder(leadId: string, callerGroupId: string, dueAt: string, note: string) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_reminders').insert({
    organization_id: c.orgId!, lead_id: leadId, caller_group_id: callerGroupId, due_at: dueAt, note, status: 'pending',
  })
  await admin.from('kp_leads').update({ status: 'callback', updated_at: now() }).eq('id', leadId).eq('organization_id', c.orgId!)
}

export async function updateReminder(id: string, patch: Partial<Reminder>) {
  const c = await ctx()
  const admin = await createServiceClient()
  await admin.from('kp_reminders').update({ ...patch }).eq('id', id).eq('organization_id', c.orgId!)
}

// ─── branding ───
export async function updateBranding(campaignId: string, patch: Partial<CampaignBranding>) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_campaign_branding').upsert({
    organization_id: c.orgId!, campaign_id: campaignId, ...patch, updated_at: now(),
  }, { onConflict: 'campaign_id' })
}
