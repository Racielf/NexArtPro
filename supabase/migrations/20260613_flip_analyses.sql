-- Phase 6A: flip_analyses table
-- Applied to production hdiejuqbhqhebrpneymo on 2026-06-13

CREATE TABLE IF NOT EXISTS flip_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id        TEXT NOT NULL DEFAULT 'rc-art',
  version           INTEGER NOT NULL DEFAULT 1,
  purchase_price    DECIMAL(12,2),
  loan_amount       DECIMAL(12,2),
  holdback          DECIMAL(12,2),
  earnest_money     DECIMAL(12,2),
  closing_costs     DECIMAL(12,2),
  arv               DECIMAL(12,2),
  commission_pct    DECIMAL(5,2) DEFAULT 6,
  renovation_budget DECIMAL(12,2),
  actual_labor      DECIMAL(12,2),
  actual_materials  DECIMAL(12,2),
  actual_services   DECIMAL(12,2),
  draws_received    DECIMAL(12,2),
  profit_gross      DECIMAL(12,2),
  profit_neto       DECIMAL(12,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TRIGGER flip_analyses_set_updated_at
  BEFORE UPDATE ON flip_analyses
  FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE flip_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flip_analyses_select_draft" ON flip_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "flip_analyses_insert_draft" ON flip_analyses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "flip_analyses_update_draft" ON flip_analyses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
