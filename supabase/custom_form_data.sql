-- Stores the values captured by a campaign's custom donor-detail form
-- (shipping address, quantity, notes, any extra fields) on each donation.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS custom_data jsonb;
