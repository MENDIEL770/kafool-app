import { createServiceClient } from '@/lib/supabase/server'
import type { PlusContext } from './context'
import { descendantCampaignIds } from './context'
import type {
  Campaign, CampaignBranding, CallerGroup, Lead, Member, Call,
  Promise as PromiseRow, Reminder, MessageTemplate,
} from './types'

export interface PlusData {
  campaigns: Campaign[]
  branding: CampaignBranding[]
  callerGroups: CallerGroup[]
  leads: Lead[]
  members: Member[]
  calls: Call[]
  promises: PromiseRow[]
  reminders: Reminder[]
  templates: MessageTemplate[]
}

const EMPTY: PlusData = {
  campaigns: [], branding: [], callerGroups: [], leads: [], members: [],
  calls: [], promises: [], reminders: [], templates: [],
}

/**
 * Load the telephony dataset for the current member, scoped by role:
 *  - super_admin / implicit-manager (org owner): the whole org
 *  - manager (kp_members): their campaign subtree
 *  - coordinator: their branch subtree
 *  - caller: only their own caller group's rows
 * Uses the service client (RLS bypass) + this in-app filtering, mirroring the
 * legacy Kafool+ pattern for email-based users.
 */
// PostgREST caps a single response at 1000 rows. kp_leads / kp_calls routinely
// exceed that (a caller can have thousands of imported contacts), so page through
// the whole set — otherwise rows silently vanish and the caller sees an empty
// list even though the import succeeded.
async function fetchAll(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  table: string, org: string,
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(table).select('*').eq('organization_id', org)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    out.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE) break
  }
  return out
}

export async function loadPlusData(ctx: PlusContext): Promise<PlusData> {
  if (!ctx.orgId || !ctx.role) return EMPTY
  const admin = await createServiceClient()
  const org = ctx.orgId

  const [campaignsRes, brandingRes, cgRes, leadsRows, membersRes, callsRows, promisesRes, remindersRes, templatesRes] =
    await Promise.all([
      admin.from('kp_campaigns').select('*').eq('organization_id', org),
      admin.from('kp_campaign_branding').select('*').eq('organization_id', org),
      admin.from('kp_caller_groups').select('*').eq('organization_id', org),
      fetchAll(admin, 'kp_leads', org),
      admin.from('kp_members').select('*').eq('organization_id', org),
      fetchAll(admin, 'kp_calls', org),
      admin.from('kp_promises').select('*').eq('organization_id', org),
      admin.from('kp_reminders').select('*').eq('organization_id', org),
      admin.from('kp_message_templates').select('*').eq('organization_id', org),
    ])

  const all: PlusData = {
    campaigns: (campaignsRes.data ?? []) as Campaign[],
    branding: (brandingRes.data ?? []) as CampaignBranding[],
    callerGroups: (cgRes.data ?? []) as CallerGroup[],
    // lift the triage decision out of custom_fields so it survives reloads
    leads: leadsRows.map((l: Record<string, unknown>) => ({
      ...l,
      call_decision: (l.custom_fields as Record<string, unknown> | null)?.call_decision as 'yes' | 'no' | undefined,
    })) as Lead[],
    members: (membersRes.data ?? []) as Member[],
    calls: callsRows as unknown as Call[],
    promises: (promisesRes.data ?? []) as PromiseRow[],
    reminders: (remindersRes.data ?? []) as Reminder[],
    templates: (templatesRes.data ?? []) as MessageTemplate[],
  }

  // super-admin / org-owner manager → whole org
  const wholeOrg = ctx.role === 'super_admin' || !ctx.member
  if (wholeOrg) return all

  // caller → only their caller group
  if (ctx.role === 'caller') {
    const cgId = ctx.member!.caller_group_id
    if (!cgId) return { ...EMPTY }
    const cg = all.callerGroups.filter(c => c.id === cgId)
    const campIds = new Set(cg.map(c => c.campaign_id))
    return {
      campaigns: all.campaigns.filter(c => campIds.has(c.id)),
      branding: all.branding.filter(b => campIds.has(b.campaign_id)),
      callerGroups: cg,
      leads: all.leads.filter(l => l.assigned_caller_group_id === cgId),
      members: all.members.filter(m => m.caller_group_id === cgId),
      calls: all.calls.filter(c => c.caller_group_id === cgId),
      promises: all.promises.filter(p => p.caller_group_id === cgId),
      reminders: all.reminders.filter(r => r.caller_group_id === cgId),
      templates: all.templates.filter(t => !t.caller_group_id || t.caller_group_id === cgId),
    }
  }

  // manager / coordinator → their campaign subtree
  const root = ctx.member!.campaign_id
  if (!root) return { ...EMPTY }
  const scope = new Set(descendantCampaignIds(all.campaigns, root))
  const campaigns = all.campaigns.filter(c => scope.has(c.id))
  const callerGroups = all.callerGroups.filter(c => scope.has(c.campaign_id))
  const cgIds = new Set(callerGroups.map(c => c.id))
  return {
    campaigns,
    branding: all.branding.filter(b => scope.has(b.campaign_id)),
    callerGroups,
    leads: all.leads.filter(l => scope.has(l.campaign_id)),
    members: all.members.filter(m => (m.campaign_id && scope.has(m.campaign_id)) || (m.caller_group_id && cgIds.has(m.caller_group_id)) || m.role === 'manager'),
    calls: all.calls.filter(c => cgIds.has(c.caller_group_id)),
    promises: all.promises.filter(p => cgIds.has(p.caller_group_id)),
    reminders: all.reminders.filter(r => cgIds.has(r.caller_group_id)),
    templates: all.templates.filter(t => !t.caller_group_id || cgIds.has(t.caller_group_id)),
  }
}
