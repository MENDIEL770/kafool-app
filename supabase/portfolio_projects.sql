-- ════════════════════════════════════════════════════════════════════════
-- Portfolio → full projects.
-- Each portfolio item (the "מודעה" / cover) can now carry a whole project:
-- a dedicated shareable page (slug), a description, a video, and extra images.
-- All columns are additive with safe defaults — existing rows keep working as
-- plain single-image ads (project_images defaults to an empty array).
-- Run once in Supabase production. RLS is unchanged (the public-read policy
-- already exposes every column of published rows).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS slug           text,                          -- shareable URL: /design/<slug>
  ADD COLUMN IF NOT EXISTS description    text,                          -- project write-up (shown on the project page)
  ADD COLUMN IF NOT EXISTS video_url      text,                          -- optional YouTube / Vimeo URL
  ADD COLUMN IF NOT EXISTS project_images jsonb NOT NULL DEFAULT '[]'::jsonb; -- extra images that make up the full project (string[])

-- slug is optional, but when set it must be unique (it's a public URL).
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_slug_unique
  ON portfolio_items (slug) WHERE slug IS NOT NULL;
