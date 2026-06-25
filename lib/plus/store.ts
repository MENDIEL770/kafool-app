'use client'

import { create } from 'zustand'
import * as api from './actions'
import type { PlusData } from './data'
import type {
  Campaign, CampaignBranding, CallerGroup, Lead, Member, Call,
  Promise as PromiseRow, Reminder, MessageTemplate, LeadStatus, Role,
} from './types'

// ============================================================================
// Client data layer for the telephony module. Same API surface as the old
// standalone zustand store, so the ported screens change only their imports.
// Hydrated from the server (loadPlusData) via <PlusProvider>; every mutation
// updates local state optimistically and persists through a Server Action.
// ============================================================================

export interface SessionUser {
  email: string
  role: Role
  organization_id: string
  campaign_id: string | null
  caller_group_id: string | null
  display_name: string
}

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`)
const nowIso = () => new Date().toISOString()
const swallow = () => { /* background persist; UI already updated optimistically */ }

interface State extends PlusData {
  session: SessionUser | null

  hydrate: (data: PlusData, session: SessionUser | null) => void
  refresh: () => Promise<void>

  // auth (handled by Kafool's real auth; kept for API compatibility)
  membershipsFor: (email: string) => { active: Member[]; pending: Member[] }
  loginAs: (email: string) => { ok: boolean; pending?: boolean; notFound?: boolean }
  loginAsMember: (memberId: string) => boolean
  logout: () => void

  // members
  requestJoin: (email: string, campaignId: string, role: Role) => void
  approveMember: (memberId: string, role: Role, campaignId: string | null, callerGroupId: string | null) => void
  rejectMember: (memberId: string) => void
  addMember: (m: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => void
  addEmailPool: (campaignId: string, emails: string[]) => { added: number; skipped: number }
  approveToPool: (memberId: string) => void
  assignFromPool: (memberId: string, branchCampaignId: string, displayName: string, link: string, goal: number, phone?: string) => string

  // campaigns
  addMasterCampaign: (name: string, goal: number, style?: 'hierarchical' | 'flat') => string
  updateCampaignStyle: (campaignId: string, style: 'hierarchical' | 'flat') => void
  addSubCampaign: (parentId: string, name: string, coordEmail: string, goal: number) => string
  addManagerAccount: (orgName: string, managerEmail: string, campaignName: string, goal: number) => string

  // caller groups
  addCallerGroup: (campaignId: string, email: string, name: string, link: string, goal: number, phone?: string) => string
  updateCallerGroup: (id: string, patch: Partial<CallerGroup>) => void
  removeCallerGroup: (id: string) => void
  ensureCallerGroupFor: (campaignId: string, email: string, name: string) => string

  // leads
  importLeads: (campaignId: string, rows: Partial<Lead>[]) => { added: number; duplicates: number; review: number }
  setCallDecision: (leadId: string, decision: 'yes' | 'no') => void
  setCallDecisionsBulk: (items: { id: string; decision: 'yes' | 'no' }[]) => void
  assignLeadsEvenly: (campaignId: string, callerGroupIds: string[]) => void
  assignLead: (leadId: string, callerGroupId: string | null) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  deleteLead: (id: string) => void
  setLeadStatus: (id: string, status: LeadStatus) => void

  // calls / promises / reminders
  logCall: (leadId: string, callerGroupId: string, outcome: LeadStatus, notes?: string) => void
  addPromise: (leadId: string, callerGroupId: string, amount: number, dueDate?: string) => void
  addReminder: (leadId: string, callerGroupId: string, dueAt: string, note: string) => void
  updateReminder: (id: string, patch: Partial<Reminder>) => void

  // branding
  updateBranding: (campaignId: string, patch: Partial<CampaignBranding>) => void

  reset: () => void
}

const EMPTY: PlusData = {
  campaigns: [], branding: [], callerGroups: [], leads: [], members: [],
  calls: [], promises: [], reminders: [], templates: [],
}

export const useStore = create<State>()((set, get) => ({
  ...EMPTY,
  session: null,

  hydrate: (data, session) => set({ ...data, session }),
  refresh: async () => { const data = await api.fetchPlusData(); set({ ...data }) },

  membershipsFor: (email) => {
    const all = get().members.filter((x) => x.email.toLowerCase() === email.toLowerCase())
    return { active: all.filter((m) => m.status === 'active' && m.is_active), pending: all.filter((m) => m.status === 'pending') }
  },
  loginAs: () => ({ ok: false }),
  loginAsMember: () => false,
  logout: () => set({ session: null }),

  requestJoin: (email, campaignId, role) => {
    const org = get().campaigns.find((c) => c.id === campaignId)?.organization_id ?? get().session?.organization_id ?? ''
    const m: Member = { id: uuid(), organization_id: org, email, user_id: null, role, campaign_id: campaignId, caller_group_id: null, status: 'pending', auth_provider: 'google', is_active: false, created_at: nowIso(), updated_at: nowIso() }
    set((s) => ({ members: [...s.members, m] }))
    api.requestJoin(email, campaignId, role).catch(swallow)
  },

  approveMember: (memberId, role, campaignId, callerGroupId) => {
    set((s) => ({ members: s.members.map((m) => m.id === memberId ? { ...m, status: 'active', is_active: true, role, campaign_id: campaignId, caller_group_id: callerGroupId, updated_at: nowIso() } : m) }))
    api.approveMember(memberId, role, campaignId, callerGroupId).catch(swallow)
  },

  rejectMember: (memberId) => {
    set((s) => ({ members: s.members.map((m) => m.id === memberId ? { ...m, status: 'rejected', is_active: false } : m) }))
    api.rejectMember(memberId).catch(swallow)
  },

  addMember: (m) => {
    const id = uuid()
    set((s) => ({ members: [...s.members, { ...m, id, created_at: nowIso(), updated_at: nowIso() }] }))
    api.addMember(id, { email: m.email, role: m.role, campaign_id: m.campaign_id, caller_group_id: m.caller_group_id, status: m.status, is_active: m.is_active }).catch(swallow)
  },

  addEmailPool: (campaignId, emails) => {
    const org = get().campaigns.find((c) => c.id === campaignId)?.organization_id ?? get().session?.organization_id ?? ''
    const existing = new Set(get().members.map((m) => m.email.toLowerCase()))
    const clean = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))))
    const toAdd: Member[] = []
    clean.forEach((email) => {
      if (existing.has(email)) return
      existing.add(email)
      toAdd.push({ id: uuid(), organization_id: org, email, user_id: null, role: 'caller', campaign_id: campaignId, caller_group_id: null, status: 'active', auth_provider: 'google', is_active: true, created_at: nowIso(), updated_at: nowIso() })
    })
    set((s) => ({ members: [...s.members, ...toAdd] }))
    api.addEmailPool(campaignId, emails).catch(swallow)
    return { added: toAdd.length, skipped: clean.length - toAdd.length }
  },

  approveToPool: (memberId) => {
    set((s) => ({ members: s.members.map((m) => m.id === memberId ? { ...m, status: 'active', is_active: true, role: 'caller', caller_group_id: null, updated_at: nowIso() } : m) }))
    api.approveToPool(memberId).catch(swallow)
  },

  assignFromPool: (memberId, branchCampaignId, displayName, link, goal, phone) => {
    const id = uuid()
    const member = get().members.find((m) => m.id === memberId)
    const org = get().campaigns.find((c) => c.id === branchCampaignId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => ({
      callerGroups: [...s.callerGroups, { id, organization_id: org, campaign_id: branchCampaignId, caller_email: member?.email ?? '', caller_user_id: null, display_name: displayName || member?.email || 'טלפן', public_slug: `caller-${id.slice(0, 6)}`, donation_link: link, personal_goal: goal, phone, created_at: nowIso(), updated_at: nowIso() }],
      members: s.members.map((m) => m.id === memberId ? { ...m, campaign_id: branchCampaignId, caller_group_id: id, role: 'caller', status: 'active', is_active: true, updated_at: nowIso() } : m),
    }))
    api.assignFromPool(id, memberId, branchCampaignId, displayName, link, goal, phone).catch(swallow)
    return id
  },

  addMasterCampaign: (name, goal, style = 'hierarchical') => {
    const id = uuid()
    const org = get().session?.organization_id ?? ''
    set((s) => ({ campaigns: [...s.campaigns, { id, organization_id: org, parent_campaign_id: null, style, name, description: '', goal_amount: goal, is_standalone: true, linked_kafool_campaign_id: null, coordinator_email: null, coordinator_user_id: null, created_at: nowIso(), updated_at: nowIso() }] }))
    api.addMasterCampaign(id, name, goal, style).catch(swallow)
    return id
  },

  updateCampaignStyle: (campaignId, style) => {
    set((s) => ({ campaigns: s.campaigns.map((c) => c.id === campaignId ? { ...c, style } : c) }))
    api.updateCampaignStyle(campaignId, style).catch(swallow)
  },

  addSubCampaign: (parentId, name, coordEmail, goal) => {
    const id = uuid()
    const org = get().session?.organization_id ?? ''
    set((s) => ({
      campaigns: [...s.campaigns, { id, organization_id: org, parent_campaign_id: parentId, style: 'hierarchical', name, description: '', goal_amount: goal, is_standalone: true, linked_kafool_campaign_id: null, coordinator_email: coordEmail, coordinator_user_id: null, created_at: nowIso(), updated_at: nowIso() }],
      members: coordEmail ? [...s.members, { id: uuid(), organization_id: org, email: coordEmail, user_id: null, role: 'coordinator', campaign_id: id, caller_group_id: null, status: 'active', auth_provider: 'google', is_active: true, created_at: nowIso(), updated_at: nowIso() }] : s.members,
    }))
    api.addSubCampaign(id, parentId, name, coordEmail, goal).catch(swallow)
    return id
  },

  // org creation lives in Kafool's super-admin, not here
  addManagerAccount: () => '',

  addCallerGroup: (campaignId, email, name, link, goal, phone) => {
    const id = uuid()
    const org = get().campaigns.find((c) => c.id === campaignId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => {
      const existingMember = s.members.find((m) => m.email.toLowerCase() === email.toLowerCase() && m.campaign_id === campaignId)
      return {
        callerGroups: [...s.callerGroups, { id, organization_id: org, campaign_id: campaignId, caller_email: email, caller_user_id: null, display_name: name, public_slug: `caller-${id.slice(0, 6)}`, donation_link: link, personal_goal: goal, phone, created_at: nowIso(), updated_at: nowIso() }],
        members: !email ? s.members : existingMember ? s.members.map((m) => m.id === existingMember.id ? { ...m, caller_group_id: id } : m) : [...s.members, { id: uuid(), organization_id: org, email, user_id: null, role: 'caller', campaign_id: campaignId, caller_group_id: id, status: 'active', auth_provider: 'google', is_active: true, created_at: nowIso(), updated_at: nowIso() }],
      }
    })
    api.addCallerGroup(id, campaignId, email, name, link, goal, phone).catch(swallow)
    return id
  },

  updateCallerGroup: (id, patch) => {
    set((s) => ({ callerGroups: s.callerGroups.map((c) => c.id === id ? { ...c, ...patch } : c) }))
    api.updateCallerGroup(id, patch).catch(swallow)
  },

  removeCallerGroup: (id) => {
    set((s) => ({ callerGroups: s.callerGroups.filter((c) => c.id !== id) }))
    api.removeCallerGroup(id).catch(swallow)
  },

  ensureCallerGroupFor: (campaignId, email, name) => {
    const existing = get().callerGroups.find((c) => c.campaign_id === campaignId && c.caller_email.toLowerCase() === email.toLowerCase())
    if (existing) return existing.id
    const id = uuid()
    const org = get().campaigns.find((c) => c.id === campaignId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => ({ callerGroups: [...s.callerGroups, { id, organization_id: org, campaign_id: campaignId, caller_email: email, caller_user_id: null, display_name: name, public_slug: `coord-${id.slice(0, 6)}`, donation_link: '', personal_goal: 0, is_coordinator: true, created_at: nowIso(), updated_at: nowIso() }] }))
    api.ensureCallerGroupFor(id, campaignId, email, name).catch(swallow)
    return id
  },

  importLeads: (campaignId, rows) => {
    const org = get().session?.organization_id ?? ''
    const existing = get().leads
    let added = 0, duplicates = 0, review = 0
    const normalized: Lead[] = []
    const seen = new Set(existing.filter((l) => l.campaign_id === campaignId).map((l) => l.phone.replace(/\D/g, '')))
    for (const r of rows) {
      const phoneRaw = (r.phone ?? '').toString()
      const digits = phoneRaw.replace(/\D/g, '')
      if (digits && seen.has(digits)) { duplicates++; continue }
      if (digits) seen.add(digits)
      const invalid = !/^0?5\d{8}$/.test(digits) && !/^0\d{8,9}$/.test(digits)
      if (invalid) review++
      normalized.push({ id: uuid(), organization_id: org, campaign_id: campaignId, assigned_caller_group_id: null, full_name: r.full_name ?? 'ללא שם', phone: phoneRaw, email: r.email, address: r.address, birthday: r.birthday, notes: r.notes, status: 'new', is_vip: r.is_vip ?? false, needs_review: invalid, donation_history: r.donation_history ?? [], ambassador_note: r.ambassador_note, import_source: 'excel', custom_fields: r.custom_fields ?? {}, call_decision: undefined, created_at: nowIso(), updated_at: nowIso() })
      added++
    }
    set((s) => ({ leads: [...s.leads, ...normalized] }))
    api.importLeads(campaignId, rows).catch(swallow)
    return { added, duplicates, review }
  },

  setCallDecision: (leadId, decision) => {
    set((s) => ({ leads: s.leads.map((l) => l.id === leadId ? { ...l, call_decision: decision } : l) }))
    api.setCallDecision(leadId, decision).catch(swallow)
  },

  // batched triage: one store pass + one server request per flush (not per swipe)
  setCallDecisionsBulk: (items) => {
    if (!items.length) return
    const m = new Map(items.map((i) => [i.id, i.decision]))
    set((s) => ({ leads: s.leads.map((l) => m.has(l.id) ? { ...l, call_decision: m.get(l.id) } : l) }))
    api.setCallDecisionsBulk(items).catch(swallow)
  },

  assignLeadsEvenly: (campaignId, callerGroupIds) => {
    if (callerGroupIds.length === 0) return
    set((s) => {
      const pool = s.leads.filter((l) => l.campaign_id === campaignId && l.assigned_caller_group_id === null && l.call_decision !== 'no')
      let i = 0
      const updated = new Map(pool.map((l) => { const cg = callerGroupIds[i % callerGroupIds.length]; i++; return [l.id, { ...l, assigned_caller_group_id: cg }] }))
      return { leads: s.leads.map((l) => updated.get(l.id) ?? l) }
    })
    api.assignLeadsEvenly(campaignId, callerGroupIds).catch(swallow)
  },

  assignLead: (leadId, callerGroupId) => {
    set((s) => ({ leads: s.leads.map((l) => l.id === leadId ? { ...l, assigned_caller_group_id: callerGroupId } : l) }))
    api.assignLead(leadId, callerGroupId).catch(swallow)
  },

  updateLead: (id, patch) => {
    set((s) => ({ leads: s.leads.map((l) => l.id === id ? { ...l, ...patch, updated_at: nowIso() } : l) }))
    api.updateLead(id, patch).catch(swallow)
  },

  deleteLead: (id) => {
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id), calls: s.calls.filter((c) => c.lead_id !== id), promises: s.promises.filter((p) => p.lead_id !== id), reminders: s.reminders.filter((r) => r.lead_id !== id) }))
    api.deleteLead(id).catch(swallow)
  },

  setLeadStatus: (id, status) => {
    set((s) => ({ leads: s.leads.map((l) => l.id === id ? { ...l, status, updated_at: nowIso() } : l) }))
    api.setLeadStatus(id, status).catch(swallow)
  },

  logCall: (leadId, callerGroupId, outcome, notes) => {
    const org = get().leads.find((l) => l.id === leadId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => ({
      calls: [...s.calls, { id: uuid(), organization_id: org, lead_id: leadId, caller_group_id: callerGroupId, outcome, notes, duration_seconds: null, answered: null, called_at: nowIso(), created_at: nowIso() }],
      leads: s.leads.map((l) => l.id === leadId ? { ...l, status: outcome, notes: notes ? notes : l.notes, updated_at: nowIso() } : l),
    }))
    api.logCall(leadId, callerGroupId, outcome, notes).catch(swallow)
  },

  addPromise: (leadId, callerGroupId, amount, dueDate) => {
    const org = get().leads.find((l) => l.id === leadId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => ({
      promises: [...s.promises, { id: uuid(), organization_id: org, lead_id: leadId, caller_group_id: callerGroupId, amount, status: 'open', due_date: dueDate, fulfilled_at: null, created_at: nowIso(), updated_at: nowIso() }],
      leads: s.leads.map((l) => l.id === leadId ? { ...l, status: 'promised' as const } : l),
    }))
    api.addPromise(leadId, callerGroupId, amount, dueDate).catch(swallow)
  },

  addReminder: (leadId, callerGroupId, dueAt, note) => {
    const org = get().leads.find((l) => l.id === leadId)?.organization_id ?? get().session?.organization_id ?? ''
    set((s) => ({
      reminders: [...s.reminders, { id: uuid(), organization_id: org, lead_id: leadId, caller_group_id: callerGroupId, due_at: dueAt, note, status: 'pending', created_at: nowIso() }],
      leads: s.leads.map((l) => l.id === leadId ? { ...l, status: 'callback' as const, updated_at: nowIso() } : l),
    }))
    api.addReminder(leadId, callerGroupId, dueAt, note).catch(swallow)
  },

  updateReminder: (id, patch) => {
    set((s) => ({ reminders: s.reminders.map((r) => r.id === id ? { ...r, ...patch } : r) }))
    api.updateReminder(id, patch).catch(swallow)
  },

  updateBranding: (campaignId, patch) => {
    set((s) => {
      const exists = s.branding.find((b) => b.campaign_id === campaignId)
      if (exists) return { branding: s.branding.map((b) => b.campaign_id === campaignId ? { ...b, ...patch, updated_at: nowIso() } : b) }
      return { branding: [...s.branding, { id: uuid(), organization_id: get().session?.organization_id ?? '', campaign_id: campaignId, primary_color: '#1e3a8a', secondary_color: '#3b82f6', accent_color: '#f59e0b', background_style: 'light', logo_url: null, banner_url: null, background_image_url: null, favicon_url: null, campaign_name: '', tagline: '', welcome_message: '', call_script: { opening: '', story: '', objections: '', closing: '' }, thank_you_message: '', preset_id: null, created_at: nowIso(), updated_at: nowIso(), ...patch } as CampaignBranding] }
    })
    api.updateBranding(campaignId, patch).catch(swallow)
  },

  reset: () => { /* no-op: data lives in Supabase */ },
}))

// ---- selectors (RLS-equivalent helpers) ----------------------------------
export function descendantCampaignIds(campaigns: Campaign[], rootId: string): string[] {
  const ids = [rootId]
  for (const c of campaigns.filter((c) => c.parent_campaign_id === rootId)) ids.push(...descendantCampaignIds(campaigns, c.id))
  return ids
}
