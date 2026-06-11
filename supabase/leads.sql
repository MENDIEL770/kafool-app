-- ════════════════════════════════════════════════════════════════════════
-- Sales leads pipeline + one-time setup-fee billing for the Kafool platform
-- ════════════════════════════════════════════════════════════════════════
-- NOTE: table is named `sales_leads` to avoid colliding with the existing
-- `leads` table (donor CRM for Kafool+ callers).
--
-- This migration is resilient: it creates the pipeline regardless, and wires
-- up the automatic import from `contact_submissions` ONLY if that table exists.

CREATE TABLE IF NOT EXISTS sales_leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name        text NOT NULL,
  contact_name    text,
  email           text,
  phone           text,
  source          text NOT NULL DEFAULT 'manual',   -- 'contact_form' | 'manual'
  stage           text NOT NULL DEFAULT 'new'
                  CHECK (stage IN ('new','contacted','proposal','awaiting_payment','won','lost')),
  setup_fee       numeric NOT NULL DEFAULT 0,        -- one-time setup fee (₪)
  notes           text,

  -- idempotency key for contact-form imports (no hard FK so the table can be
  -- created even before contact_submissions exists)
  submission_id   uuid UNIQUE,

  -- after conversion
  converted_org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,

  -- billing (Grow / Meshulam)
  payment_status        text NOT NULL DEFAULT 'unpaid'  -- 'unpaid' | 'paid'
                        CHECK (payment_status IN ('unpaid','paid')),
  paid_at               timestamptz,
  grow_process_id       text,
  grow_process_token    text,
  grow_transaction_id   text,
  grow_raw              jsonb,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_leads_stage_idx          ON sales_leads (stage);
CREATE INDEX IF NOT EXISTS sales_leads_payment_status_idx ON sales_leads (payment_status);
CREATE INDEX IF NOT EXISTS sales_leads_created_at_idx     ON sales_leads (created_at DESC);

-- ─── keep updated_at fresh ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_sales_leads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_leads_touch_updated_at ON sales_leads;
CREATE TRIGGER sales_leads_touch_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW EXECUTE FUNCTION touch_sales_leads_updated_at();

-- ─── auto-import function (safe to create even if contact_submissions absent;
--      NEW.* fields are resolved only when the trigger actually fires) ──────
CREATE OR REPLACE FUNCTION sales_lead_from_submission()
RETURNS trigger AS $$
BEGIN
  INSERT INTO sales_leads (org_name, contact_name, email, phone, source, submission_id, notes)
  VALUES (
    COALESCE(NULLIF(NEW.full_name, ''), 'פנייה חדשה'),
    NEW.full_name,
    NEW.email,
    NEW.phone,
    'contact_form',
    NEW.id,
    NEW.message
  )
  ON CONFLICT (submission_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── wire up trigger + backfill ONLY if contact_submissions exists ──────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contact_submissions'
  ) THEN
    DROP TRIGGER IF EXISTS submission_to_sales_lead ON contact_submissions;
    CREATE TRIGGER submission_to_sales_lead
      AFTER INSERT ON contact_submissions
      FOR EACH ROW EXECUTE FUNCTION sales_lead_from_submission();

    INSERT INTO sales_leads (org_name, contact_name, email, phone, source, submission_id, notes, created_at)
    SELECT
      COALESCE(NULLIF(full_name, ''), 'פנייה חדשה'),
      full_name, email, phone, 'contact_form', id, message, created_at
    FROM contact_submissions
    ON CONFLICT (submission_id) DO NOTHING;
  END IF;
END $$;

-- ─── RLS: super admins only ─────────────────────────────────────────────
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_leads_super_admin_all" ON sales_leads;
CREATE POLICY "sales_leads_super_admin_all" ON sales_leads
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );
