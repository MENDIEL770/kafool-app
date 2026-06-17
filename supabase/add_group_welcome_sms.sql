-- Custom SMS template sent to a person who opens a fundraising group
-- via the public site. Supports placeholders: {שם} (manager name), {קישור} (group link).
-- When null, the API falls back to a built-in default message.
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS group_welcome_sms text;
