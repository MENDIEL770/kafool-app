-- Diagnostic capture of every incoming payment webhook (even ones we ignore),
-- so we can see whether Nedarim/Kesher actually call us and with what fields.
CREATE TABLE IF NOT EXISTS webhook_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source     text NOT NULL,          -- 'nedarim' | 'kesher'
  ip         text,
  body       jsonb,
  note       text,                   -- why it was ignored, if it was
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Service role (used by the webhook) bypasses RLS; enabling it with no policy
-- keeps the raw payloads private from anon/auth clients.
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS webhook_logs_created_idx ON webhook_logs (created_at DESC);
