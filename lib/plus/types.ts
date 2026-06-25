// ============================================================================
// Kafool+ — Domain types (mirror of the Supabase/PostgreSQL schema)
// Every entity carries organization_id for multi-tenancy + RLS.
// ============================================================================

export type Role = "super_admin" | "manager" | "coordinator" | "caller";

export type LeadStatus =
  | "new"
  | "no_answer"
  | "busy"
  | "wrong_number"
  | "not_interested"
  | "removed"
  | "callback"
  | "promised"
  | "donated";

export type BackgroundStyle = "light" | "dark" | "custom";
export type PresetCategory = "colors" | "script" | "message";
export type PromiseStatus = "open" | "fulfilled" | "cancelled";
export type ReminderStatus = "pending" | "done" | "dismissed";
export type MemberStatus = "pending" | "active" | "rejected";
export type ImportSource = "excel" | "contacts" | "manual";
export type MessageChannel = "sms" | "whatsapp";
export type CallOutcome = LeadStatus;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  kafoolplus_only: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignStyle = "hierarchical" | "flat";

export interface Campaign {
  id: string;
  organization_id: string;
  parent_campaign_id: string | null; // self-reference for hierarchy
  style: CampaignStyle; // 'hierarchical' = master+branches+coordinators; 'flat' = single, manager does all
  name: string;
  description?: string;
  goal_amount: number;
  is_standalone: boolean;
  linked_kafool_campaign_id: string | null;
  coordinator_email?: string | null;
  coordinator_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallScript {
  opening: string;
  story: string;
  objections: string;
  closing: string;
}

export interface CampaignBranding {
  id: string;
  organization_id: string;
  campaign_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_style: BackgroundStyle;
  logo_url: string | null;
  banner_url: string | null;
  background_image_url: string | null;
  favicon_url: string | null;
  media_url?: string | null; // sharable media (image/PDF) sent to donors
  campaign_name: string;
  tagline: string;
  welcome_message: string;
  call_script: CallScript;
  thank_you_message: string;
  preset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandingPreset {
  id: string;
  name: string;
  category: PresetCategory;
  config: Record<string, unknown>;
  is_active: boolean;
}

export interface CallerGroup {
  id: string;
  organization_id: string;
  campaign_id: string;
  caller_email: string;
  caller_user_id: string | null;
  display_name: string;
  public_slug: string;
  donation_link: string;
  charidy_team_id?: string | null; // numeric Charidy team id (from team_id_list) — auto-resolved from the link
  personal_goal: number;
  phone?: string; // caller's phone — used to SMS them callback reminders
  is_coordinator?: boolean; // true when a coordinator works as a caller too
  created_at: string;
  updated_at: string;
}

export interface DonationHistoryEntry {
  date: string;
  amount: number;
  campaign?: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  campaign_id: string;
  assigned_caller_group_id: string | null;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  status: LeadStatus;
  is_vip: boolean;
  needs_review: boolean;
  donation_history: DonationHistoryEntry[];
  ambassador_note?: string;
  import_source: ImportSource;
  custom_fields: Record<string, unknown>;
  // local-only flag for the "who to call" filter screen
  call_decision?: "yes" | "no" | undefined;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  organization_id: string;
  lead_id: string;
  caller_group_id: string;
  outcome: CallOutcome;
  notes?: string;
  duration_seconds?: number | null; // populated automatically in VoIP phase
  answered?: boolean | null;
  called_at: string;
  created_at: string;
}

export interface Promise {
  id: string;
  organization_id: string;
  lead_id: string;
  caller_group_id: string;
  amount: number;
  status: PromiseStatus;
  due_date?: string;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  organization_id: string;
  lead_id: string;
  caller_group_id: string;
  due_at: string;
  note: string;
  status: ReminderStatus;
  created_at: string;
}

export interface Member {
  id: string;
  organization_id: string;
  email: string;
  user_id: string | null;
  role: Role;
  campaign_id: string | null;
  caller_group_id: string | null;
  status: MemberStatus;
  auth_provider: "google";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  organization_id: string;
  caller_group_id: string | null;
  channel: MessageChannel;
  title: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
