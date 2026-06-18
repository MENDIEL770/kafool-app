-- ════════════════════════════════════════════════════════════════════════
-- Donation type (one-time vs standing order) + standing-order details.
-- For a הוראת קבע we now record the FULL commitment as `amount`
-- (monthly_amount × installments), and keep the breakdown so the manager can
-- see "הו"ק · 36 ח׳" in the donors page. Additive + safe: existing rows become
-- one_time and keep their amount untouched.
-- Run once in Supabase production.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS payment_type   text NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS installments   int,      -- number of monthly payments (hok only)
  ADD COLUMN IF NOT EXISTS monthly_amount numeric;  -- per-month amount (hok only)

-- guard the allowed values (existing rows already default to 'one_time')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'donations_payment_type_check'
  ) THEN
    ALTER TABLE donations
      ADD CONSTRAINT donations_payment_type_check
      CHECK (payment_type IN ('one_time','hok'));
  END IF;
END $$;
