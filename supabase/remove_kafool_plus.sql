-- ════════════════════════════════════════════════════════════════════════════
-- Remove Kafool+ (telephony) from this database — run in Supabase SQL Editor.
-- ⚠️ DESTRUCTIVE & IRREVERSIBLE: drops all Kafool+ tables and their data
-- (2567 leads, 38 coordinators, donations, etc.). Make sure you have migrated /
-- exported anything you need to the standalone Kafool+ system FIRST.
-- The fundraising system (organizations, campaigns, donations, groups, profiles)
-- is untouched.
-- ════════════════════════════════════════════════════════════════════════════

drop table if exists
  kp_donations,
  kp_reminders,
  kp_promises,
  kp_calls,
  kp_message_templates,
  kp_leads,
  kp_caller_groups,
  kp_campaign_branding,
  kp_campaigns,
  kp_members,
  kafoolplus_members
cascade;

-- The org module flag is no longer used (fundraising is the only product here).
alter table organizations drop column if exists has_kafool_plus;
