-- Multi-provider payment support. Each organization chooses its payment provider
-- (Kesher or Nedarim Plus) and stores the matching credentials.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'kesher',
  ADD COLUMN IF NOT EXISTS nedarim_mosad text,
  ADD COLUMN IF NOT EXISTS nedarim_api_valid text,
  ADD COLUMN IF NOT EXISTS nedarim_active boolean DEFAULT false;
