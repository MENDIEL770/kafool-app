-- Outgoing WhatsApp queue. To avoid a number getting flagged/blocked for sending
-- many messages in a burst, sends are throttled per org: when a burst is
-- detected the message is queued here and a drainer cron sends the backlog with
-- a delay between messages. Low volume still sends immediately (also logged here).
-- Service-role only (RLS on, no policy).
CREATE TABLE IF NOT EXISTS whatsapp_outbox (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_phone   text NOT NULL,
  message    text NOT NULL,
  media_url  text,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts   int  NOT NULL DEFAULT 0,
  error      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_pending_idx ON whatsapp_outbox (status, org_id, created_at);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_sent_idx    ON whatsapp_outbox (org_id, sent_at);
ALTER TABLE whatsapp_outbox ENABLE ROW LEVEL SECURITY;
