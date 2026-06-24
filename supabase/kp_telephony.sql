-- ============================================================================
-- Kafool+ telephony module — merged into the existing Kafool DB.
-- Tables are prefixed kp_ (campaigns/members already exist in Kafool). Column
-- names match the source schema so the ported UI/data-layer maps 1:1.
-- REUSES the existing `organizations` table (org_id) — does NOT recreate it.
-- Runs alongside the legacy kafoolplus_* tables (kept until cutover).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---- enums (prefixed to avoid clashing with anything in Kafool) ------------
do $$ begin
  create type kp_role as enum ('super_admin','manager','coordinator','caller');
  create type kp_lead_status as enum ('new','no_answer','busy','wrong_number','not_interested','removed','callback','promised','donated');
  create type kp_background_style as enum ('light','dark','custom');
  create type kp_preset_category as enum ('colors','script','message');
  create type kp_promise_status as enum ('open','fulfilled','cancelled');
  create type kp_reminder_status as enum ('pending','done','dismissed');
  create type kp_member_status as enum ('pending','active','rejected');
  create type kp_import_source as enum ('excel','contacts','manual');
  create type kp_message_channel as enum ('sms','whatsapp');
exception when duplicate_object then null; end $$;

-- ---- tables ----------------------------------------------------------------
-- telephony campaign hierarchy (master campaign -> branches); optionally linked
-- to a real Kafool fundraising campaign for donations/reports.
create table if not exists kp_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_campaign_id uuid references kp_campaigns(id) on delete cascade,
  name text not null,
  description text,
  goal_amount numeric not null default 0,
  is_standalone boolean not null default true,
  linked_kafool_campaign_id uuid references campaigns(id) on delete set null,
  coordinator_email text,
  coordinator_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_kp_campaigns_org on kp_campaigns(organization_id);
create index if not exists idx_kp_campaigns_parent on kp_campaigns(parent_campaign_id);

create table if not exists kp_caller_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references kp_campaigns(id) on delete cascade,
  caller_email text not null,
  caller_user_id uuid,
  display_name text not null,
  public_slug text unique not null,
  donation_link text,
  personal_goal numeric not null default 0,
  phone text,
  is_coordinator boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_kp_cg_org on kp_caller_groups(organization_id);
create index if not exists idx_kp_cg_campaign on kp_caller_groups(campaign_id);

create table if not exists kp_campaign_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references kp_campaigns(id) on delete cascade,
  primary_color text not null default '#1e3a8a',
  secondary_color text not null default '#3b82f6',
  accent_color text not null default '#f59e0b',
  background_style kp_background_style not null default 'light',
  logo_url text, banner_url text, background_image_url text, favicon_url text,
  campaign_name text not null default '',
  tagline text default '',
  welcome_message text default '',
  call_script jsonb not null default '{"opening":"","story":"","objections":"","closing":""}',
  thank_you_message text default '',
  preset_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_kp_branding_campaign on kp_campaign_branding(campaign_id);

create table if not exists kp_branding_presets (
  id text primary key,
  name text not null,
  category kp_preset_category not null,
  config jsonb not null default '{}',
  is_active boolean not null default true
);

create table if not exists kp_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references kp_campaigns(id) on delete cascade,
  assigned_caller_group_id uuid references kp_caller_groups(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text, address text, birthday text, notes text,
  status kp_lead_status not null default 'new',
  is_vip boolean not null default false,
  needs_review boolean not null default false,
  donation_history jsonb not null default '[]',
  ambassador_note text,
  import_source kp_import_source not null default 'manual',
  custom_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_kp_leads_org on kp_leads(organization_id);
create index if not exists idx_kp_leads_campaign on kp_leads(campaign_id);
create index if not exists idx_kp_leads_cg on kp_leads(assigned_caller_group_id);
create unique index if not exists idx_kp_leads_dedup on kp_leads(campaign_id, phone);

create table if not exists kp_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references kp_leads(id) on delete cascade,
  caller_group_id uuid not null references kp_caller_groups(id) on delete cascade,
  outcome kp_lead_status not null,
  notes text,
  duration_seconds integer,
  answered boolean,
  called_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_kp_calls_lead on kp_calls(lead_id);
create index if not exists idx_kp_calls_cg on kp_calls(caller_group_id);

create table if not exists kp_promises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references kp_leads(id) on delete cascade,
  caller_group_id uuid not null references kp_caller_groups(id) on delete cascade,
  amount numeric not null,
  status kp_promise_status not null default 'open',
  due_date date,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists kp_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references kp_leads(id) on delete cascade,
  caller_group_id uuid not null references kp_caller_groups(id) on delete cascade,
  due_at timestamptz not null,
  note text,
  status kp_reminder_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_kp_reminders_cg on kp_reminders(caller_group_id);

-- membership/role-scope join. user_id maps to auth.users (Kafool's existing
-- Supabase Auth); claimed by email on first Google login.
create table if not exists kp_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  user_id uuid,
  role kp_role not null,
  campaign_id uuid references kp_campaigns(id) on delete cascade,
  caller_group_id uuid references kp_caller_groups(id) on delete set null,
  status kp_member_status not null default 'pending',
  auth_provider text not null default 'google',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_kp_members_email on kp_members(lower(email));
create index if not exists idx_kp_members_user on kp_members(user_id);

create table if not exists kp_message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  caller_group_id uuid references kp_caller_groups(id) on delete cascade,
  channel kp_message_channel not null,
  title text not null,
  body text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- RLS (defense-in-depth; the data layer uses the service client + app-level
-- scope checks, mirroring the existing Kafool+ pattern for email-based users) --
create or replace function kp_current_member()
returns kp_members language sql stable as $$
  select * from kp_members where user_id = auth.uid() and is_active limit 1;
$$;

create or replace function kp_campaign_in_scope(target uuid)
returns boolean language plpgsql stable as $$
declare m kp_members; found boolean;
begin
  select * into m from kp_current_member();
  if m.id is null then return false; end if;
  if m.role = 'super_admin' then return true; end if;
  with recursive tree as (
    select id from kp_campaigns where id = m.campaign_id
    union all
    select c.id from kp_campaigns c join tree t on c.parent_campaign_id = t.id
  )
  select exists(select 1 from tree where id = target) into found;
  return coalesce(found, false);
end $$;

alter table kp_campaigns enable row level security;
alter table kp_campaign_branding enable row level security;
alter table kp_caller_groups enable row level security;
alter table kp_leads enable row level security;
alter table kp_calls enable row level security;
alter table kp_promises enable row level security;
alter table kp_reminders enable row level security;
alter table kp_members enable row level security;
alter table kp_message_templates enable row level security;
alter table kp_branding_presets enable row level security;

drop policy if exists kp_presets_read on kp_branding_presets;
create policy kp_presets_read on kp_branding_presets for select using (true);

drop policy if exists kp_campaigns_rw on kp_campaigns;
create policy kp_campaigns_rw on kp_campaigns for all
  using (organization_id = (select organization_id from kp_current_member()) and kp_campaign_in_scope(id))
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_branding_rw on kp_campaign_branding;
create policy kp_branding_rw on kp_campaign_branding for all
  using (organization_id = (select organization_id from kp_current_member()) and kp_campaign_in_scope(campaign_id))
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_cg_rw on kp_caller_groups;
create policy kp_cg_rw on kp_caller_groups for all
  using (
    organization_id = (select organization_id from kp_current_member())
    and (
      (select role from kp_current_member()) in ('super_admin','manager','coordinator') and kp_campaign_in_scope(campaign_id)
      or id = (select caller_group_id from kp_current_member())
    )
  )
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_leads_rw on kp_leads;
create policy kp_leads_rw on kp_leads for all
  using (
    organization_id = (select organization_id from kp_current_member())
    and (
      (select role from kp_current_member()) in ('super_admin','manager','coordinator') and kp_campaign_in_scope(campaign_id)
      or assigned_caller_group_id = (select caller_group_id from kp_current_member())
    )
  )
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_calls_rw on kp_calls;
create policy kp_calls_rw on kp_calls for all
  using (
    organization_id = (select organization_id from kp_current_member())
    and (
      (select role from kp_current_member()) in ('super_admin','manager','coordinator')
      or caller_group_id = (select caller_group_id from kp_current_member())
    )
  )
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_promises_rw on kp_promises;
create policy kp_promises_rw on kp_promises for all
  using (organization_id = (select organization_id from kp_current_member()))
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_reminders_rw on kp_reminders;
create policy kp_reminders_rw on kp_reminders for all
  using (organization_id = (select organization_id from kp_current_member()))
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_members_rw on kp_members;
create policy kp_members_rw on kp_members for all
  using (organization_id = (select organization_id from kp_current_member()))
  with check (organization_id = (select organization_id from kp_current_member()));

drop policy if exists kp_templates_rw on kp_message_templates;
create policy kp_templates_rw on kp_message_templates for all
  using (organization_id = (select organization_id from kp_current_member()))
  with check (organization_id = (select organization_id from kp_current_member()));
