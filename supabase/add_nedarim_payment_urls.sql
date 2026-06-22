-- Separate payment-link columns per provider.
-- Until now both "קשר" and "נדרים פלוס" shared the kesher_* columns, so pasting a
-- link under one provider made it appear under the other. Nedarim now gets its
-- own set of columns; existing nedarim orgs have their links moved across.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS nedarim_page_url    text,
  ADD COLUMN IF NOT EXISTS nedarim_url_hok     text,
  ADD COLUMN IF NOT EXISTS nedarim_url_bit     text,
  ADD COLUMN IF NOT EXISTS nedarim_url_bank    text,
  ADD COLUMN IF NOT EXISTS nedarim_page_url_en text,
  ADD COLUMN IF NOT EXISTS nedarim_url_hok_en  text;

-- Move existing Nedarim orgs' links from the shared kesher_* columns into their
-- own columns.
UPDATE organizations SET
  nedarim_page_url    = kesher_page_url,
  nedarim_url_hok     = kesher_url_hok,
  nedarim_url_bit     = kesher_url_bit,
  nedarim_url_bank    = kesher_url_bank,
  nedarim_page_url_en = kesher_page_url_en,
  nedarim_url_hok_en  = kesher_url_hok_en
WHERE payment_provider = 'nedarim';

-- Clear the kesher_* columns for those orgs so the "קשר" tab starts empty.
UPDATE organizations SET
  kesher_page_url    = NULL,
  kesher_url_hok     = NULL,
  kesher_url_bit     = NULL,
  kesher_url_bank    = NULL,
  kesher_page_url_en = NULL,
  kesher_url_hok_en  = NULL
WHERE payment_provider = 'nedarim';

-- New orgs start with no provider chosen (the settings UI shows the picker first).
ALTER TABLE organizations ALTER COLUMN payment_provider DROP DEFAULT;
