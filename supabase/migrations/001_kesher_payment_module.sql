-- ─────────────────────────────────────────────
-- Migration: Kesher Payment Module
-- ─────────────────────────────────────────────

-- 1. kesher_connections — per-org Kesher credentials
CREATE TABLE IF NOT EXISTS kesher_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  project_number text NOT NULL,
  payment_page_id integer NOT NULL,
  kesher_username text NOT NULL,
  kesher_password_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE kesher_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kesher_connections_org" ON kesher_connections
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin());

-- 2. Add missing columns to donations
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS amount_agorot integer,
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'one_time'
    CHECK (payment_type IN ('one_time','recurring')),
  ADD COLUMN IF NOT EXISTS num_payments integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kesher_obligation_ref text,
  ADD COLUMN IF NOT EXISTS kesher_status_code integer,
  ADD COLUMN IF NOT EXISTS receipt_link text,
  ADD COLUMN IF NOT EXISTS uniq_num text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed'));

-- Backfill amount_agorot from amount (ILS → agorot)
UPDATE donations SET amount_agorot = ROUND(amount * 100)::integer
  WHERE amount_agorot IS NULL AND amount IS NOT NULL;

-- 3. increment_campaign_amount RPC (safe upsert)
CREATE OR REPLACE FUNCTION increment_campaign_amount(
  campaign_id uuid,
  amount_agorot integer
)
RETURNS void AS $$
  UPDATE campaigns
  SET
    raised_amount = raised_amount + (amount_agorot::numeric / 100),
    updated_at = now()
  WHERE id = campaign_id;
$$ LANGUAGE sql SECURITY DEFINER;
