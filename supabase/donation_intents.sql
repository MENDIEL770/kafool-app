-- Holds the custom-form values a donor fills BEFORE they leave for the hosted
-- payment page. The payment provider doesn't forward these fields, so the
-- Nedarim/Kesher callback re-attaches them to the recorded donation by matching
-- (campaign_id, phone, amount) within a recent window. Service-role only.
CREATE TABLE IF NOT EXISTS donation_intents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  group_slug  text,
  phone       text,
  amount      numeric,
  custom_data jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donation_intents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS donation_intents_match_idx
  ON donation_intents (campaign_id, created_at DESC);
