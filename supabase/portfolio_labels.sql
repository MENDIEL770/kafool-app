-- ════════════════════════════════════════════════════════════════════════
-- Portfolio labels (תוויות / סגנונות) — a managed list the super-admin edits,
-- used as a dropdown when tagging portfolio items. Items still store the label
-- name as free text (backward compatible), so renaming a label here does not
-- retroactively change already-tagged items.
-- Run once in Supabase production. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portfolio_labels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL UNIQUE,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_labels_sort_idx ON portfolio_labels (sort_order);

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE portfolio_labels ENABLE ROW LEVEL SECURITY;

-- anyone can read the list (the public /design gallery may filter by it)
DROP POLICY IF EXISTS "portfolio_labels_public_read" ON portfolio_labels;
CREATE POLICY "portfolio_labels_public_read" ON portfolio_labels
  FOR SELECT USING (true);

-- super admins manage the list
DROP POLICY IF EXISTS "portfolio_labels_super_admin_all" ON portfolio_labels;
CREATE POLICY "portfolio_labels_super_admin_all" ON portfolio_labels
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- seed a few sensible defaults (skipped if a label with that name already exists)
INSERT INTO portfolio_labels (name, sort_order) VALUES
  ('מודעה', 0), ('לוגו', 1), ('באנר', 2), ('פלייר', 3), ('דף נחיתה', 4), ('מיתוג', 5)
ON CONFLICT (name) DO NOTHING;
