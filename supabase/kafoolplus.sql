-- ════════════════════════════════════════════════════════════════════════
-- Kafool+ — telephone fundraising call-center module.
-- Phase 1 schema + RLS. Run once in Supabase production. Safe to re-run.
--
-- Conventions (match the existing Kafool platform):
--   • tenant column is `org_id` (NOT organization_id), with the existing
--     helpers auth_org_id() and is_super_admin().
--   • enums as text + CHECK (like profiles.role).
--   • RLS here enforces the TENANT boundary (org_id) — the critical isolation.
--     Finer role scoping (coordinator → own branch, caller → own group) is
--     enforced in the app/API layer (server actions + route guards), which is
--     how the rest of Kafool already works. Tighten to per-scope RLS later.
-- ════════════════════════════════════════════════════════════════════════

-- Manager-account flag: lock everyone in the tenant to Kafool+ only.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kafoolplus_only boolean NOT NULL DEFAULT false;

-- ─── Master campaign (national / network level) ───────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_master_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goal_amount numeric DEFAULT 0,
  is_standalone boolean NOT NULL DEFAULT false,           -- true = no public page
  linked_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  call_script jsonb,                                       -- opening/story/objections/close
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Branch (one coordinator) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_branches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  master_campaign_id uuid NOT NULL REFERENCES kafoolplus_master_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  coordinator_email text,
  coordinator_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  goal_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Caller group (1:1 with a caller, unique public slug) ──────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_caller_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES kafoolplus_branches(id) ON DELETE CASCADE,
  caller_email text,
  caller_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  display_name text,
  public_slug text NOT NULL UNIQUE,
  donation_link text,                                      -- auto (linked) / manual (standalone)
  personal_goal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Leads ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES kafoolplus_branches(id) ON DELETE CASCADE,
  assigned_caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE SET NULL,
  full_name text,
  phone text,
  email text,
  address text,
  birthday date,
  notes text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','no_answer','busy','wrong_number','not_interested','removed','callback','promised','donated')),
  is_vip boolean NOT NULL DEFAULT false,
  donation_history jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{year, amount}]
  import_source text CHECK (import_source IN ('excel','contacts','manual')),
  -- server-side queue lock so two callers never get the same lead
  locked_by uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE SET NULL,
  locked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Calls ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_calls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES kafoolplus_leads(id) ON DELETE CASCADE,
  caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE SET NULL,
  outcome text
    CHECK (outcome IN ('no_answer','busy','wrong_number','not_interested','removed','callback','promised','donated')),
  notes text,
  called_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ─── Promises ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_promises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES kafoolplus_leads(id) ON DELETE CASCADE,
  caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','cancelled')),
  due_date date,
  fulfilled_at timestamptz,                                -- future: set by payment webhook
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Reminders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES kafoolplus_leads(id) ON DELETE CASCADE,
  caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','dismissed')),
  created_at timestamptz DEFAULT now()
);

-- ─── Members (email-based permission mapping — the auth core) ──────────────
CREATE TABLE IF NOT EXISTS kafoolplus_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('manager','coordinator','caller')),
  master_campaign_id uuid REFERENCES kafoolplus_master_campaigns(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES kafoolplus_branches(id) ON DELETE CASCADE,
  caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS kafoolplus_members_email_campaign_unique
  ON kafoolplus_members (lower(email), master_campaign_id);

-- ─── Message templates (SMS / WhatsApp) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS kafoolplus_message_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  caller_group_id uuid REFERENCES kafoolplus_caller_groups(id) ON DELETE CASCADE, -- null = general
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp')),
  title text,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Indexes (scope lookups) ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS kp_branches_master_idx     ON kafoolplus_branches (master_campaign_id);
CREATE INDEX IF NOT EXISTS kp_groups_branch_idx       ON kafoolplus_caller_groups (branch_id);
CREATE INDEX IF NOT EXISTS kp_leads_branch_idx        ON kafoolplus_leads (branch_id);
CREATE INDEX IF NOT EXISTS kp_leads_assigned_idx      ON kafoolplus_leads (assigned_caller_group_id);
CREATE INDEX IF NOT EXISTS kp_leads_status_idx        ON kafoolplus_leads (status);
CREATE INDEX IF NOT EXISTS kp_calls_lead_idx          ON kafoolplus_calls (lead_id);
CREATE INDEX IF NOT EXISTS kp_promises_group_idx      ON kafoolplus_promises (caller_group_id);
CREATE INDEX IF NOT EXISTS kp_reminders_group_due_idx ON kafoolplus_reminders (caller_group_id, due_at);
CREATE INDEX IF NOT EXISTS kp_members_user_idx        ON kafoolplus_members (user_id);

-- ─── updated_at trigger (shared) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION kafoolplus_touch_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kafoolplus_master_campaigns','kafoolplus_branches','kafoolplus_caller_groups',
    'kafoolplus_leads','kafoolplus_promises','kafoolplus_members','kafoolplus_message_templates'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION kafoolplus_touch_updated_at();', t, t);
  END LOOP;
END $$;

-- ─── RLS: tenant isolation on every table ─────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'kafoolplus_master_campaigns','kafoolplus_branches','kafoolplus_caller_groups',
    'kafoolplus_leads','kafoolplus_calls','kafoolplus_promises','kafoolplus_reminders',
    'kafoolplus_members','kafoolplus_message_templates'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_tenant" ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY "%I_tenant" ON %I FOR ALL
         USING (org_id = auth_org_id() OR is_super_admin())
         WITH CHECK (org_id = auth_org_id() OR is_super_admin());', t, t);
  END LOOP;
END $$;
