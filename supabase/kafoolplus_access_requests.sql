-- Kafool+ access requests: a logged-in Google account that isn't registered yet
-- can ask to join. The super-admin reviews and assigns it to a campaign.
-- Run once in Supabase. Safe to re-run.

CREATE TABLE IF NOT EXISTS kafoolplus_access_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  full_name text,
  note text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','rejected')),
  assigned_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  handled_at timestamptz
);
CREATE INDEX IF NOT EXISTS kp_access_requests_status_idx ON kafoolplus_access_requests (status);
CREATE UNIQUE INDEX IF NOT EXISTS kp_access_requests_open_email
  ON kafoolplus_access_requests (lower(email)) WHERE status = 'pending';

ALTER TABLE kafoolplus_access_requests ENABLE ROW LEVEL SECURITY;
-- Reads/writes go through service-role APIs (requester has no org); only
-- super-admins may read directly.
DROP POLICY IF EXISTS "kp_access_requests_super_admin" ON kafoolplus_access_requests;
CREATE POLICY "kp_access_requests_super_admin" ON kafoolplus_access_requests
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
