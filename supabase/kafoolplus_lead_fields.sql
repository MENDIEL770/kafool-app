-- Kafool+ leads: extra fields for the branch-network Excel import.
-- ambassador_note = who recruited the donor (column H); needs_review = flagged
-- leads (no phone / non-Israeli number) for the coordinator to check.
-- Run once in Supabase. Safe to re-run.

ALTER TABLE kafoolplus_leads
  ADD COLUMN IF NOT EXISTS ambassador_note text,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS kp_leads_needs_review_idx ON kafoolplus_leads (needs_review);
