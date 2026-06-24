'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPlusContext, makePlusSlug } from './context'
import { loadPlusData } from './data'
import type { Lead, LeadStatus, CallerGroup, CampaignBranding, Role, Reminder } from './types'

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
  await admin.from('kp_caller_groups').update({ ...patch, updated_at: now() }).eq('id', id).eq('organization_id', c.orgId!)
}

export async function removeCallerGroup(id: string) {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  await admin.from('kp_caller_groups').delete().eq('id', id).eq('organization_id', c.orgId!)
}

// ─── leads ───
export async function importLeads(campaignId: string, rows: Partial<Lead>[]): Promise<{ added: number; duplicates: number; review: number }> {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: existing } = await admin.from('kp_leads').select('phone').eq('campaign_id', campaignId)
  const seen = new Set((existing ?? []).map(l => (l.phone as string).replace(/\D/g, '')))
  let added = 0, duplicates = 0, review = 0
  const toAdd: Record<string, unknown>[] = []
  for (const r of rows) {
    const phoneRaw = (r.phone ?? '').toString()
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits && seen.has(digits)) { duplicates++; continue }
    if (digits) seen.add(digits)
    const invalid = !/^0?5\d{8}$/.test(digits) && !/^0\d{8,9}$/.test(digits)
    if (invalid) review++
    toAdd.push({
      organization_id: c.orgId!, campaign_id: campaignId, full_name: r.full_name ?? 'ללא שם', phone: phoneRaw,
      email: r.email ?? null, address: r.address ?? null, birthday: r.birthday ?? null, notes: r.notes ?? null,
      status: 'new', is_vip: r.is_vip ?? false, needs_review: invalid,
      donation_history: r.donation_history ?? [], ambassador_note: r.ambassador_note ?? null,
      import_source: 'excel', custom_fields: r.custom_fields ?? {},
    })
    added++
  }
  if (toAdd.length) await admin.from('kp_leads').insert(toAdd)
  return { added, duplicates, review }
}

export async function setCallDecision(leadId: string, decision: 'yes' | 'no') {
  const c = await ctx(); assertManagerial(c.role)
  const admin = await createServiceClient()
  const { data: lead } = await admin.from('kp_leads').select('custom_fields').eq('id', leadId).maybeSingle()
  const cf = { ...(lead?.custom_fields as Record<string, unknown> ?? {}), call_decision: decision }
  await admin.from('kp_leads').update({ custom_fields: cf, updated_at: now() }).eq('id', leadId).eq('organization_id', c.orgId!)
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
