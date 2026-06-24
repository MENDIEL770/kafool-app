-- Per-organization module entitlements (which products the org is subscribed to).
-- A super-admin sets these when creating/editing an org; the dashboard menu and
-- the server-side route gates read them.
--   has_fundraising  — the donation/fundraising system (campaigns, reports, SMS…)
--   has_kafool_plus  — the Kafool+ call-center module
-- Defaults keep every existing org on fundraising; Kafool+ is opt-in.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS has_fundraising boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_kafool_plus boolean NOT NULL DEFAULT false;
