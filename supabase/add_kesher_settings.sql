-- Add Kesher payment settings to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS kesher_page_id text,
ADD COLUMN IF NOT EXISTS kesher_page_url text,
ADD COLUMN IF NOT EXISTS kesher_webhook_secret text,
ADD COLUMN IF NOT EXISTS kesher_active boolean NOT NULL DEFAULT false;
