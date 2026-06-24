-- Carry the donor's email + the resolved thank-you-email template on the intent,
-- so the payment callback can send the right email after the donation records.
ALTER TABLE donation_intents
  ADD COLUMN IF NOT EXISTS donor_email   text,
  ADD COLUMN IF NOT EXISTS email_template jsonb;
