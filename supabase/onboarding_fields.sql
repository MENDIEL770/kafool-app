-- ════════════════════════════════════════════════════════════════════════
-- New-manager onboarding — extra lead fields + manual payment tracking.
-- The client (or super admin) fills an intake form; a Supabase auth account is
-- created immediately with the chosen password (we never store the password —
-- only auth_user_id). Dashboard access opens only on activation (org+profile).
-- Additive + safe. Run once in Supabase production.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS contact_last_name text,
  ADD COLUMN IF NOT EXISTS address           text,
  ADD COLUMN IF NOT EXISTS company_id        text,     -- ח.פ / מספר עמותה
  ADD COLUMN IF NOT EXISTS how_heard         text,     -- איך הגעת אלינו
  ADD COLUMN IF NOT EXISTS auth_user_id      uuid,     -- the created Supabase user (pre-activation)
  ADD COLUMN IF NOT EXISTS activated_at      timestamptz,
  -- manual payment tracking (alongside the existing setup_fee + Grow billing)
  ADD COLUMN IF NOT EXISTS agreed_amount     numeric,
  ADD COLUMN IF NOT EXISTS amount_paid       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method    text,     -- e.g. אשראי / העברה / מזומן / Grow
  ADD COLUMN IF NOT EXISTS receipt_issued    boolean NOT NULL DEFAULT false,
  -- public intake link token (client fills the form themselves)
  ADD COLUMN IF NOT EXISTS intake_token      text;

CREATE UNIQUE INDEX IF NOT EXISTS sales_leads_intake_token_idx
  ON sales_leads (intake_token) WHERE intake_token IS NOT NULL;
