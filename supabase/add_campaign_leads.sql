-- Leads from the "campaign readiness" questionnaire (/services). Each submission
-- is a lead saved even if the person never returns. The personal report page
-- (/report/<token>) reads ONLY the row for its token, server-side with the
-- service role — this table is never exposed to the public (RLS on, no policy).
CREATE TABLE IF NOT EXISTS campaign_leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text UNIQUE NOT NULL,          -- hard-to-guess, for /report/<token>
  name       text NOT NULL,
  phone      text NOT NULL,                 -- normalized (last 9 digits, like the rest of the app)
  org        text NOT NULL,
  answers    jsonb NOT NULL,                -- raw answers {questionId: optionIndex}
  score      int,                           -- server-computed, 0..100
  profile    text,                          -- ready | vision | audience | start | track
  range_low  bigint,                        -- server-computed ₪ range (rounded to thousands)
  range_high bigint,
  potential  bigint,
  goal       int,
  report     jsonb,                         -- full computed snapshot, so the report stays stable if the formula changes
  source     text,                          -- e.g. 'services'
  sms_sent_at timestamptz,                  -- set once the report SMS is sent (prevents a duplicate)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_leads_created_idx ON campaign_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_leads_phone_idx   ON campaign_leads (phone);
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;  -- service-role only; no public policy
