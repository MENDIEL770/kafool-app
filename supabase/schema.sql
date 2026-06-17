-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registration_number text,
  receipt_name text,
  wants_sms boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','manager','caller')),
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  goal_amount numeric NOT NULL DEFAULT 0,
  bonus_goal_amount numeric,
  raised_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ILS',
  video_url text,
  cover_image_url text,
  logo_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended')),
  start_at timestamptz,
  end_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{"donation_amounts":[180,360,720,1800,3600],"primary_color":"#2563eb","secondary_color":"#1e40af","about_text":null}',
  group_welcome_sms text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Groups
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  goal_amount numeric NOT NULL DEFAULT 0,
  raised_amount numeric NOT NULL DEFAULT 0,
  manager_name text,
  manager_phone text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, slug)
);

-- Callers
CREATE TABLE callers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('idle','calling','break','offline')),
  total_called int NOT NULL DEFAULT 0,
  total_donated numeric NOT NULL DEFAULT 0,
  personal_goal numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Leads
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  caller_id uuid REFERENCES callers(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  amount_asked numeric,
  amount_pledged numeric,
  previous_donations numeric,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','called','donated','callback','skip','dnc')),
  notes text,
  callback_at timestamptz,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Donations
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ILS',
  donor_name text,
  donor_phone text,
  donor_email text,
  dedication text,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  caller_id uuid REFERENCES callers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','refunded')),
  kesher_transaction_id text UNIQUE,
  kesher_raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Dedications (wall items - dedicated prayer/memorial)
CREATE TABLE dedications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id uuid REFERENCES donations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dedicator_name text NOT NULL,
  honoree_name text,
  message text,
  show_on_wall boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Dedication Items (physical items for purchase/dedication)
CREATE TABLE dedication_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  price numeric NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  quantity_remaining int NOT NULL DEFAULT 1,
  is_exclusive boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- SMS Logs
CREATE TABLE sms_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  donation_id uuid REFERENCES donations(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Automation Rules
CREATE TABLE automation_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  trigger_event text NOT NULL CHECK (trigger_event IN ('donation_completed','lead_assigned','callback_due')),
  action_type text NOT NULL CHECK (action_type IN ('send_sms','webhook')),
  template text NOT NULL,
  delay_minutes int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Webhook Logs
CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source text NOT NULL DEFAULT 'kesher',
  payload jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Gallery Images
CREATE TABLE campaign_gallery (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ───────────────────────────────────────────
-- Functions & Triggers
-- ───────────────────────────────────────────

-- Atomic increment of raised_amount on campaign and group
CREATE OR REPLACE FUNCTION increment_campaign_raised(
  p_campaign_id uuid,
  p_group_id uuid,
  p_amount numeric
) RETURNS void AS $$
BEGIN
  UPDATE campaigns SET raised_amount = raised_amount + p_amount WHERE id = p_campaign_id;
  IF p_group_id IS NOT NULL THEN
    UPDATE groups SET raised_amount = raised_amount + p_amount WHERE id = p_group_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX idx_campaigns_org ON campaigns(org_id);
CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_org ON donations(org_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_caller ON leads(caller_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_groups_campaign ON groups(campaign_id);
CREATE INDEX idx_sms_logs_org ON sms_logs(org_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
