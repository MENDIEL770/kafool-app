-- A media file (image/PDF) the caller can share with donors — sent as a link in
-- SMS and as a preview/file in WhatsApp.
alter table kp_campaign_branding
  add column if not exists media_url text;
