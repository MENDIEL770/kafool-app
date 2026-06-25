-- ============================================================================
-- Kafool+ — Charidy donation sync.
-- One row per Charidy webhook (donation), so a lead can have MANY donations
-- (donated twice / to several caller groups). Verifies that the donor a caller
-- phoned actually entered the link and gave — the match key is the PHONE.
-- Run once in Supabase. Safe to re-run.
-- ============================================================================

-- Each caller group's Charidy team id (numeric, from team_id_list in the webhook).
-- Lets us tell WHICH group a donation was actually credited to.
alter table kp_caller_groups
  add column if not exists charidy_team_id text;
create index if not exists idx_kp_cg_charidy_team on kp_caller_groups(charidy_team_id);

create table if not exists kp_donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- the called lead this donation belongs to (matched by phone, fallback name)
  lead_id uuid references kp_leads(id) on delete set null,
  -- the caller group that actually RECEIVED the money (matched by charidy_team_id)
  recipient_caller_group_id uuid references kp_caller_groups(id) on delete set null,
  -- the open promise this donation fulfilled, if any
  promise_id uuid references kp_promises(id) on delete set null,
  donor_name text,
  donor_phone text,
  donor_email text,
  amount numeric not null default 0,
  -- Charidy identifiers
  charidy_transaction_id text unique,        -- idempotency key
  charidy_donation_id text,
  charidy_campaign_id text,
  charidy_team_id text,                       -- first team in team_id_list
  charidy_team_name text,
  charidy_team_link text,                     -- deep link to that team on Charidy
  -- true when the recipient group differs from the lead's assigned caller (or
  -- the lead's caller couldn't be determined) — surfaced to the original caller
  cross_group boolean not null default false,
  donated_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_kp_donations_org on kp_donations(organization_id);
create index if not exists idx_kp_donations_lead on kp_donations(lead_id);
create index if not exists idx_kp_donations_recipient on kp_donations(recipient_caller_group_id);

-- ---- RLS: same tenant pattern as the rest of kp_* ----------------------------
alter table kp_donations enable row level security;
drop policy if exists kp_donations_rw on kp_donations;
create policy kp_donations_rw on kp_donations for all
  using (organization_id = (select organization_id from kp_current_member()))
  with check (organization_id = (select organization_id from kp_current_member()));
