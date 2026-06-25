-- Kafool+ — Charidy embeddable donate page (donate.charidy.com/<id>).
-- This page (unlike charidy.com) allows iframe embedding and accepts prefilled
-- donor params (team_id, fullname, displayname, email, phone). The donate id
-- isn't in the public API, so the coordinator pastes it once per campaign.
-- Run once in Supabase. Safe to re-run.

alter table kp_campaigns
  add column if not exists charidy_donate_url text;
