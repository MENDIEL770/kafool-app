-- Fix: deleting a donation silently affected 0 rows because the donations
-- table had RLS enabled with no DELETE policy. Allow org members (and super
-- admins) to delete their own org's donations.
CREATE POLICY "donations_org_delete" ON donations
  FOR DELETE USING (org_id = auth_org_id() OR is_super_admin());
