-- ════════════════════════════════════════════════════════════════════════
-- Portfolio (תיק עבודות) — ONE-TIME full setup for production.
-- The portfolio_items table was never created in prod ("Could not find the
-- table public.portfolio_items"). This creates it WITH the full-project columns
-- already included, plus the trigger and RLS. Safe to run more than once.
-- Replaces running portfolio.sql + portfolio_projects.sql separately.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url      text NOT NULL,
  label          text,                          -- design style / category (free text)
  title          text,                          -- optional caption
  sort_order     int  NOT NULL DEFAULT 0,
  is_published   boolean NOT NULL DEFAULT true,
  -- full-project fields
  slug           text,                          -- shareable URL: /design/<slug>
  description    text,                          -- project write-up
  video_url      text,                          -- optional YouTube / Vimeo URL
  project_images jsonb NOT NULL DEFAULT '[]'::jsonb, -- extra images (string[])
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- in case the table already existed without the newer columns
ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS slug           text,
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS video_url      text,
  ADD COLUMN IF NOT EXISTS project_images jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS portfolio_sort_idx      ON portfolio_items (sort_order);
CREATE INDEX IF NOT EXISTS portfolio_published_idx ON portfolio_items (is_published);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_slug_unique
  ON portfolio_items (slug) WHERE slug IS NOT NULL;

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_portfolio_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portfolio_touch_updated_at ON portfolio_items;
CREATE TRIGGER portfolio_touch_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION touch_portfolio_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- anyone can read published items (public gallery)
DROP POLICY IF EXISTS "portfolio_public_read" ON portfolio_items;
CREATE POLICY "portfolio_public_read" ON portfolio_items
  FOR SELECT USING (is_published = true);

-- super admins manage everything (incl. reading unpublished)
DROP POLICY IF EXISTS "portfolio_super_admin_all" ON portfolio_items;
CREATE POLICY "portfolio_super_admin_all" ON portfolio_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));
