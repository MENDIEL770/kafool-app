-- Manager "tools" — short links. Each org can create short URLs (kafool.com/s/<code>)
-- with an optional custom code, that 302-redirect to any target and count clicks.
CREATE TABLE IF NOT EXISTS short_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  target_url text NOT NULL,
  label text,
  clicks integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

-- Org members manage their own org's links; the public redirect reads via the service role.
CREATE POLICY "short_links_org_read"   ON short_links FOR SELECT USING (org_id = auth_org_id() OR is_super_admin());
CREATE POLICY "short_links_org_insert" ON short_links FOR INSERT WITH CHECK (org_id = auth_org_id() OR is_super_admin());
CREATE POLICY "short_links_org_delete" ON short_links FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());

CREATE INDEX IF NOT EXISTS short_links_org_idx ON short_links(org_id);
