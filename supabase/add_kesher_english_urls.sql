-- English Kesher payment-page links (shown when the donor switches the page to
-- English). Additive + safe. Run once in Supabase production.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kesher_page_url_en text,   -- one-time, English page
  ADD COLUMN IF NOT EXISTS kesher_url_hok_en  text;   -- standing order, English page
