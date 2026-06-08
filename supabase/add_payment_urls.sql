-- Add multiple payment URL columns to organizations
-- Run this in Supabase SQL Editor
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS kesher_url_hok     text,   -- הוראת קבע
ADD COLUMN IF NOT EXISTS kesher_url_bit     text,   -- ביט
ADD COLUMN IF NOT EXISTS kesher_url_bank    text;   -- העברה בנקאית
-- kesher_page_url is already the one-time donation URL
