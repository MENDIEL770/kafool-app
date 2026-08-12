-- Per-organization Stripe credentials (foreign-currency donations).
-- Stored on the organizations row; read server-side only (service role) by the
-- checkout + webhook routes. Never selected by the browser client.
alter table organizations
  add column if not exists stripe_secret_key text,
  add column if not exists stripe_webhook_secret text;
