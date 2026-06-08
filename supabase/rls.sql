-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE callers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedication_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_gallery ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- Helper functions
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ───────────────────────────────────────────
-- organizations
-- ───────────────────────────────────────────

-- Anyone can read slug + name (needed for public campaign pages)
CREATE POLICY "orgs_public_read" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "orgs_owner_insert" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_owner_update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid() OR is_super_admin());

CREATE POLICY "orgs_super_admin_all" ON organizations
  FOR ALL USING (is_super_admin());

-- ───────────────────────────────────────────
-- profiles
-- ───────────────────────────────────────────

CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (id = auth.uid() OR org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ───────────────────────────────────────────
-- campaigns
-- ───────────────────────────────────────────

-- Public can read active campaigns (for donation pages)
CREATE POLICY "campaigns_public_read" ON campaigns
  FOR SELECT USING (status = 'active' OR org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "campaigns_org_write" ON campaigns
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "campaigns_org_update" ON campaigns
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "campaigns_org_delete" ON campaigns
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- groups
-- ───────────────────────────────────────────

CREATE POLICY "groups_public_read" ON groups
  FOR SELECT USING (true);

CREATE POLICY "groups_org_write" ON groups
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "groups_org_update" ON groups
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "groups_org_delete" ON groups
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- donations
-- ───────────────────────────────────────────

-- Public insert (anonymous donors)
CREATE POLICY "donations_public_insert" ON donations
  FOR INSERT WITH CHECK (true);

-- Only org members can read
CREATE POLICY "donations_org_read" ON donations
  FOR SELECT USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "donations_org_update" ON donations
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- dedications
-- ───────────────────────────────────────────

CREATE POLICY "dedications_public_read" ON dedications
  FOR SELECT USING (show_on_wall = true OR org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "dedications_public_insert" ON dedications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "dedications_org_update" ON dedications
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- dedication_items
-- ───────────────────────────────────────────

CREATE POLICY "dedication_items_public_read" ON dedication_items
  FOR SELECT USING (true);

CREATE POLICY "dedication_items_org_write" ON dedication_items
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "dedication_items_org_update" ON dedication_items
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "dedication_items_org_delete" ON dedication_items
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- callers
-- ───────────────────────────────────────────

CREATE POLICY "callers_org_read" ON callers
  FOR SELECT USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "callers_org_write" ON callers
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "callers_org_update" ON callers
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- leads
-- ───────────────────────────────────────────

CREATE POLICY "leads_org_read" ON leads
  FOR SELECT USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "leads_org_write" ON leads
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "leads_org_update" ON leads
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "leads_org_delete" ON leads
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());

-- ───────────────────────────────────────────
-- sms_logs, automation_rules, webhook_logs
-- ───────────────────────────────────────────

CREATE POLICY "sms_logs_org_all" ON sms_logs
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "automation_rules_org_all" ON automation_rules
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "webhook_logs_super_admin" ON webhook_logs
  FOR ALL USING (is_super_admin());

-- ───────────────────────────────────────────
-- campaign_gallery
-- ───────────────────────────────────────────

CREATE POLICY "gallery_public_read" ON campaign_gallery
  FOR SELECT USING (true);

CREATE POLICY "gallery_org_write" ON campaign_gallery
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "gallery_org_update" ON campaign_gallery
  FOR UPDATE USING (org_id = auth_org_id() OR is_super_admin());

CREATE POLICY "gallery_org_delete" ON campaign_gallery
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());
