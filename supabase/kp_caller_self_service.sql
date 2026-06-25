-- ============================================================================
-- Kafool+ — caller self-service + coordinator Charidy links.
-- • kp_campaigns.charidy_campaign_link: the branch's Charidy CAMPAIGN url, used
--   to list the campaign's teams so a caller's group link can be picked from it.
-- Caller self-imported leads carry custom_fields.needs_triage=true and their
-- swipe decision in custom_fields.call_decision — no schema change needed there.
-- Run once in Supabase. Safe to re-run.
-- ============================================================================

alter table kp_campaigns
  add column if not exists charidy_campaign_link text;
