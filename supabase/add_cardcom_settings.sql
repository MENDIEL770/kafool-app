-- CardCom payment provider (per-organization). API v11 (JSON) LowProfile.
-- terminal is a plain identifier; api_name + api_password are encrypted (lib/crypto).
alter table organizations
  add column if not exists cardcom_terminal      text,
  add column if not exists cardcom_api_name       text,   -- encrypted
  add column if not exists cardcom_api_password    text,   -- encrypted (refunds only)
  add column if not exists cardcom_active          boolean default false;

-- payment_provider already allows any string (no CHECK constraint) — 'cardcom' is valid as-is.
