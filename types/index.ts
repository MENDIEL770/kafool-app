export type OrgStatus = 'pending' | 'active' | 'suspended'
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'caller'
export type CampaignStatus = 'draft' | 'active' | 'ended'
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type LeadStatus = 'new' | 'assigned' | 'called' | 'donated' | 'callback' | 'skip' | 'dnc'
export type CallerStatus = 'idle' | 'calling' | 'break' | 'offline'
export type SmsStatus = 'queued' | 'sent' | 'delivered' | 'failed'
export type AutomationTrigger = 'donation_completed' | 'lead_assigned' | 'callback_due'
export type AutomationAction = 'send_sms' | 'webhook'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: OrgStatus
  owner_id: string
  registration_number: string | null
  receipt_name: string | null
  wants_sms: boolean
  created_at: string
}

export interface Profile {
  id: string
  org_id: string | null
  full_name: string
  role: UserRole
  phone: string | null
  created_at: string
}

export interface Campaign {
  id: string
  org_id: string
  slug: string
  title: string
  description: string | null
  goal_amount: number
  bonus_goal_amount: number | null
  raised_amount: number
  currency: string
  video_url: string | null
  cover_image_url: string | null
  logo_url: string | null
  status: CampaignStatus
  start_at: string | null
  end_at: string | null
  settings: CampaignSettings
  group_welcome_sms: string | null
  created_at: string
}

export interface CampaignSettings {
  donation_amounts: number[]
  primary_color: string
  secondary_color: string
  about_text: string | null
}

export interface Donation {
  id: string
  campaign_id: string
  org_id: string
  amount: number
  currency: string
  donor_name: string | null
  donor_phone: string | null
  donor_email: string | null
  dedication: string | null
  group_id: string | null
  caller_id: string | null
  payment_status: DonationStatus
  kesher_transaction_id: string | null
  kesher_raw: Record<string, unknown> | null
  created_at: string
}

export interface Group {
  id: string
  campaign_id: string
  org_id: string
  name: string
  slug: string
  description: string | null
  goal_amount: number
  raised_amount: number
  manager_name: string | null
  manager_phone: string | null
  image_url: string | null
  created_at: string
}

export interface Caller {
  id: string
  profile_id: string
  org_id: string
  campaign_id: string
  status: CallerStatus
  total_called: number
  total_donated: number
  personal_goal: number
  created_at: string
  profile?: Profile
}

export interface Lead {
  id: string
  org_id: string
  campaign_id: string
  caller_id: string | null
  name: string
  phone: string
  email: string | null
  amount_asked: number | null
  amount_pledged: number | null
  previous_donations: number | null
  status: LeadStatus
  notes: string | null
  callback_at: string | null
  priority: number
  created_at: string
}

export interface Dedication {
  id: string
  donation_id: string
  campaign_id: string
  org_id: string
  dedicator_name: string
  honoree_name: string | null
  message: string | null
  show_on_wall: boolean
  created_at: string
}

export interface DedicationItem {
  id: string
  campaign_id: string
  org_id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  quantity: number
  quantity_remaining: number
  is_exclusive: boolean
  created_at: string
}

export interface SmsLog {
  id: string
  org_id: string
  campaign_id: string | null
  lead_id: string | null
  donation_id: string | null
  to_phone: string
  message: string
  status: SmsStatus
  provider_id: string | null
  sent_at: string | null
  created_at: string
}

export interface AutomationRule {
  id: string
  org_id: string
  campaign_id: string
  trigger_event: AutomationTrigger
  action_type: AutomationAction
  template: string
  delay_minutes: number
  is_active: boolean
  created_at: string
}

export interface WebhookLog {
  id: string
  source: string
  payload: Record<string, unknown>
  signature_valid: boolean
  processed: boolean
  error: string | null
  created_at: string
}
