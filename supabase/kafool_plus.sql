-- ════════════════════════════════════════════════════════════════════════
-- Kafool+ — telemarketing foundation (phase 1)
--   • full lead-status state machine
--   • atomic lead locking for concurrent callers (no double-dial)
--   • call audit trail, promises, donor master, link-send log
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Donor master (cross-campaign history) ──────────────────────────
CREATE TABLE IF NOT EXISTS donors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  total_donated numeric NOT NULL DEFAULT 0,
  last_donation_at timestamptz,
  do_not_call boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS donors_org_phone_uq ON donors (org_id, phone) WHERE phone IS NOT NULL;

-- ─── 2. Extend the leads state machine + locking/audit columns ──────────
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'new','assigned','called','no_answer','busy','wrong_number',
  'callback','promise','donated','skip','dnc','do_not_call'
));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS locked_by     uuid REFERENCES callers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS call_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_call_at  timestamptz,
  ADD COLUMN IF NOT EXISTS donor_id      uuid REFERENCES donors(id) ON DELETE SET NULL;

-- ─── 3. Call audit log (every status transition) ───────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  caller_id uuid REFERENCES callers(id) ON DELETE SET NULL,
  outcome text NOT NULL,            -- no_answer/busy/wrong_number/callback/promise/donated/do_not_call
  duration_seconds int,
  amount numeric,
  note text,
  created_at timestamptz DEFAULT now()
);

-- ─── 4. Promises (commitments to give later) ───────────────────────────
CREATE TABLE IF NOT EXISTS promises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  donor_id uuid REFERENCES donors(id) ON DELETE SET NULL,
  caller_id uuid REFERENCES callers(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  due_date date,
  fulfilled boolean NOT NULL DEFAULT false,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ─── 5. Donation-link send log (WhatsApp / SMS / Email) ────────────────
CREATE TABLE IF NOT EXISTS link_sends (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  caller_id uuid REFERENCES callers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  created_at timestamptz DEFAULT now()
);

-- ─── 6. Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS leads_claim_idx   ON leads (campaign_id, status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS leads_locked_idx  ON leads (locked_at) WHERE locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS call_logs_caller_idx ON call_logs (caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS call_logs_lead_idx   ON call_logs (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS promises_campaign_idx ON promises (campaign_id, fulfilled);

-- ════════════════════════════════════════════════════════════════════════
-- 7. ATOMIC LEAD CLAIM — the heart of the concurrency model.
--    FOR UPDATE SKIP LOCKED guarantees two callers never get the same lead.
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION claim_next_lead(p_caller_id uuid, p_campaign_id uuid)
RETURNS SETOF leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM callers WHERE id = p_caller_id;
  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_id
  FROM leads
  WHERE campaign_id = p_campaign_id
    AND org_id = v_org_id
    AND status IN ('new','assigned','callback','no_answer','busy')
    AND (locked_by IS NULL OR locked_at < now() - interval '5 minutes')
    AND (caller_id IS NULL OR caller_id = p_caller_id)
    AND (status <> 'callback' OR callback_at IS NULL OR callback_at <= now())
    AND (status NOT IN ('no_answer','busy') OR last_call_at IS NULL OR last_call_at < now() - interval '20 minutes')
  ORDER BY (status = 'callback') DESC, priority DESC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE leads
  SET locked_by = p_caller_id,
      locked_at = now(),
      caller_id = p_caller_id,
      status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END
  WHERE id = v_id
  RETURNING *;
END;
$$;

-- release a lead's lock without changing its outcome (e.g. caller skipped)
CREATE OR REPLACE FUNCTION release_lead(p_lead_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE leads SET locked_by = NULL, locked_at = NULL WHERE id = p_lead_id;
$$;

-- return abandoned (stale-locked) leads to the queue — run on a schedule
CREATE OR REPLACE FUNCTION release_stale_locks(p_minutes int DEFAULT 5)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  UPDATE leads SET locked_by = NULL, locked_at = NULL
  WHERE locked_by IS NOT NULL
    AND locked_at < now() - make_interval(mins => p_minutes)
    AND status IN ('new','assigned','callback','no_answer','busy');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- upsert a donor and add to their cross-campaign total (called on a donation)
CREATE OR REPLACE FUNCTION upsert_donor(p_org_id uuid, p_name text, p_phone text, p_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO donors (org_id, name, phone, total_donated, last_donation_at)
  VALUES (p_org_id, COALESCE(NULLIF(p_name,''),'תורם'), NULLIF(p_phone,''), COALESCE(p_amount,0), now())
  ON CONFLICT (org_id, phone) WHERE phone IS NOT NULL DO UPDATE
    SET total_donated = donors.total_donated + COALESCE(p_amount,0),
        last_donation_at = now(),
        name = COALESCE(NULLIF(EXCLUDED.name,''), donors.name)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_next_lead(uuid, uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION release_lead(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION release_stale_locks(int)      TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_donor(uuid, text, text, numeric) TO authenticated;

-- ─── 8. RLS for the new tables (org members + super admin) ─────────────
ALTER TABLE donors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donors_org_all ON donors;
CREATE POLICY donors_org_all ON donors FOR ALL
  USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

DROP POLICY IF EXISTS call_logs_org_all ON call_logs;
CREATE POLICY call_logs_org_all ON call_logs FOR ALL
  USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

DROP POLICY IF EXISTS promises_org_all ON promises;
CREATE POLICY promises_org_all ON promises FOR ALL
  USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

DROP POLICY IF EXISTS link_sends_org_all ON link_sends;
CREATE POLICY link_sends_org_all ON link_sends FOR ALL
  USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());
