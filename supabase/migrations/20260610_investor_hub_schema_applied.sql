-- ============================================================
-- DRAFT ONLY — STAGING ONLY
-- NexArtPro — Phase 5: Investor Hub Schema (UUID Adaptation)
-- Migration: 20260610_investor_hub_schema_draft.sql
-- Branch: integration/investor-hub-schema
-- ============================================================
-- ⚠️  DO NOT APPLY TO PRODUCTION
-- ⚠️  Apply only to local Supabase (`supabase start`) or staging project
-- ⚠️  All RLS policies are TO authenticated USING (true) — staging scaffold
-- ⚠️  Financial immutability triggers are REAL — do not remove them
-- ============================================================
-- Fix v2 (post PR review):
--   1. set_updated_at() renamed → investor_set_updated_at()
--      Avoids overwriting any existing global function in MAIN
--   2. work_orders bridge ALTER TABLE removed from this file
--      Moved to: 20260610_investor_hub_work_orders_bridge_draft.sql
--   3. RLS policies changed from PUBLIC to TO authenticated
--      Prevents anon access to financial/investor data in staging
--   4. uuid-ossp extension removed (gen_random_uuid uses pgcrypto only)
-- ============================================================


-- ============================================================
-- 0. PREREQUISITES
-- ============================================================

-- pgcrypto: required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. PROJECT NUMBER SEQUENCE AND HELPER FUNCTIONS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1000;

-- investor_set_updated_at: scoped to Investor Hub tables only
-- Does NOT use CREATE OR REPLACE on a shared name to avoid overwriting MAIN functions
CREATE OR REPLACE FUNCTION investor_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign project_number on INSERT if not provided
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := 'PROJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('project_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. PROJECTS TABLE
-- ============================================================
-- Adaptation from NexArtWO:
--   id TEXT PRIMARY KEY (seq) → id UUID PRIMARY KEY
--   human-readable ID preserved as project_number TEXT UNIQUE
--   company_id TEXT DEFAULT 'rc-art' added (MAIN standard)
--   deleted_at TIMESTAMPTZ added (MAIN soft-delete pattern)

CREATE TABLE IF NOT EXISTS projects (
  -- Identity
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT        UNIQUE NOT NULL DEFAULT '',    -- e.g. PROJ-2026-1000
  company_id     TEXT        NOT NULL DEFAULT 'rc-art',

  -- Basic info
  name           TEXT        NOT NULL,
  address        TEXT        NOT NULL DEFAULT '',
  purchase_date  DATE,
  status         TEXT        NOT NULL DEFAULT 'planning'
                   CHECK (status IN ('planning','active','completed','on_hold','cancelled')),
  responsible    TEXT        NOT NULL DEFAULT '',

  -- Acquisition financials
  purchase_price          NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  down_payment            NUMERIC NOT NULL DEFAULT 0 CHECK (down_payment >= 0),
  loan_amount             NUMERIC NOT NULL DEFAULT 0 CHECK (loan_amount >= 0),
  realtor_fee             NUMERIC NOT NULL DEFAULT 0 CHECK (realtor_fee >= 0),
  title_company           TEXT    NOT NULL DEFAULT '',
  title_company_fee       NUMERIC NOT NULL DEFAULT 0 CHECK (title_company_fee >= 0),
  closing_costs           NUMERIC NOT NULL DEFAULT 0 CHECK (closing_costs >= 0),
  inspection_fee          NUMERIC NOT NULL DEFAULT 0 CHECK (inspection_fee >= 0),
  insurance               NUMERIC NOT NULL DEFAULT 0 CHECK (insurance >= 0),

  -- Sale (filled when selling)
  sale_price                  NUMERIC NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  selling_agent_commission    NUMERIC NOT NULL DEFAULT 0 CHECK (selling_agent_commission >= 0),
  seller_closing_costs        NUMERIC NOT NULL DEFAULT 0 CHECK (seller_closing_costs >= 0),

  -- Parties
  buying_agent          TEXT NOT NULL DEFAULT '',
  buying_agent_company  TEXT NOT NULL DEFAULT '',
  selling_agent         TEXT NOT NULL DEFAULT '',
  lender_name           TEXT NOT NULL DEFAULT '',
  lender_contact        TEXT NOT NULL DEFAULT '',

  -- Property attributes
  property_type TEXT NOT NULL DEFAULT 'residential',
  beds          INTEGER NOT NULL DEFAULT 0 CHECK (beds >= 0),
  baths         NUMERIC NOT NULL DEFAULT 0 CHECK (baths >= 0),
  sqft          INTEGER NOT NULL DEFAULT 0 CHECK (sqft >= 0),
  year_built    INTEGER NOT NULL DEFAULT 0 CHECK (year_built >= 0),

  -- Metadata
  notes       TEXT        NOT NULL DEFAULT '',
  deleted_at  TIMESTAMPTZ,                         -- MAIN soft-delete pattern
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id     ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status         ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects(project_number);

DROP TRIGGER IF EXISTS trg_projects_project_number ON projects;
CREATE TRIGGER trg_projects_project_number
BEFORE INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION generate_project_number();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_draft" ON projects;
DROP POLICY IF EXISTS "projects_insert_draft" ON projects;
DROP POLICY IF EXISTS "projects_update_draft" ON projects;
-- TO authenticated: prevents anon access even in staging
-- Phase 6: replace USING (true) with app_roles-based conditions
CREATE POLICY "projects_select_draft" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_draft" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update_draft" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- No DELETE policy — use status = 'cancelled' + deleted_at


-- ============================================================
-- 3. PROJECT EXPENSES
-- ============================================================
-- Adaptation: id SERIAL → UUID, project_id TEXT FK → UUID FK
--             work_order_id TEXT FK → UUID FK
--             company_id added
-- Immutability triggers: KEPT (financial integrity rules, not auth rules)

CREATE TABLE IF NOT EXISTS project_expenses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id   UUID        REFERENCES work_orders(id) ON DELETE RESTRICT,
  company_id      TEXT        NOT NULL DEFAULT 'rc-art',

  vendor          TEXT        NOT NULL DEFAULT '',
  description     TEXT        NOT NULL DEFAULT '',
  amount          NUMERIC     NOT NULL DEFAULT 0 CHECK (amount >= 0),
  tax             NUMERIC     NOT NULL DEFAULT 0 CHECK (tax >= 0),
  category        TEXT        NOT NULL DEFAULT 'materials'
                    CHECK (category IN ('materials','tools','subcontractor','rental','permits','other')),
  type            TEXT        NOT NULL DEFAULT 'expense',

  receipt_date        DATE,
  receipt_image_url   TEXT NOT NULL DEFAULT '',
  receipt_items       JSONB NOT NULL DEFAULT '[]',

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     TEXT NOT NULL DEFAULT '',
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT NOT NULL DEFAULT '',

  created_by      UUID REFERENCES auth.users(id),
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_company_id ON project_expenses(company_id);

CREATE OR REPLACE FUNCTION prevent_expense_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RULE: Cannot delete project expenses. Set status to ''cancelled'' instead.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_expense_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount        IS DISTINCT FROM NEW.amount        OR
     OLD.tax           IS DISTINCT FROM NEW.tax           OR
     OLD.project_id    IS DISTINCT FROM NEW.project_id    OR
     OLD.work_order_id IS DISTINCT FROM NEW.work_order_id OR
     OLD.receipt_date  IS DISTINCT FROM NEW.receipt_date  OR
     OLD.vendor        IS DISTINCT FROM NEW.vendor
  THEN
    RAISE EXCEPTION 'RULE: Cannot modify historical financial fields. Create a compensating record or set status to cancelled.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_project_expenses ON project_expenses;
CREATE TRIGGER trg_no_delete_project_expenses
BEFORE DELETE ON project_expenses
FOR EACH ROW EXECUTE FUNCTION prevent_expense_delete();

DROP TRIGGER IF EXISTS trg_no_update_project_expenses ON project_expenses;
CREATE TRIGGER trg_no_update_project_expenses
BEFORE UPDATE ON project_expenses
FOR EACH ROW EXECUTE FUNCTION prevent_expense_update();

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_expenses_select_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert_draft" ON project_expenses;
DROP POLICY IF EXISTS "project_expenses_update_draft" ON project_expenses;
CREATE POLICY "project_expenses_select_draft" ON project_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_expenses_insert_draft" ON project_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_expenses_update_draft" ON project_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 4. PROJECT REFUNDS
-- ============================================================

CREATE TABLE IF NOT EXISTS project_refunds (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID    NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id   UUID    REFERENCES work_orders(id) ON DELETE RESTRICT,
  expense_id      UUID    REFERENCES project_expenses(id) ON DELETE RESTRICT,
  company_id      TEXT    NOT NULL DEFAULT 'rc-art',

  vendor          TEXT    NOT NULL DEFAULT '',
  description     TEXT    NOT NULL DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),

  receipt_date        DATE,
  receipt_image_url   TEXT NOT NULL DEFAULT '',

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     TEXT NOT NULL DEFAULT '',
  approved_at     TIMESTAMPTZ,

  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_refunds_project_id ON project_refunds(project_id);

CREATE OR REPLACE FUNCTION prevent_refund_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RULE: Cannot delete project refunds. Set status to ''cancelled'' instead.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_refund_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount      IS DISTINCT FROM NEW.amount      OR
     OLD.project_id  IS DISTINCT FROM NEW.project_id  OR
     OLD.expense_id  IS DISTINCT FROM NEW.expense_id  OR
     OLD.receipt_date IS DISTINCT FROM NEW.receipt_date OR
     OLD.vendor      IS DISTINCT FROM NEW.vendor
  THEN
    RAISE EXCEPTION 'RULE: Cannot modify historical refund fields. Create a new record or set status to cancelled.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_project_refunds ON project_refunds;
CREATE TRIGGER trg_no_delete_project_refunds
BEFORE DELETE ON project_refunds
FOR EACH ROW EXECUTE FUNCTION prevent_refund_delete();

DROP TRIGGER IF EXISTS trg_no_update_project_refunds ON project_refunds;
CREATE TRIGGER trg_no_update_project_refunds
BEFORE UPDATE ON project_refunds
FOR EACH ROW EXECUTE FUNCTION prevent_refund_update();

ALTER TABLE project_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_refunds_select_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_refunds_insert_draft" ON project_refunds;
DROP POLICY IF EXISTS "project_refunds_update_draft" ON project_refunds;
CREATE POLICY "project_refunds_select_draft" ON project_refunds FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_refunds_insert_draft" ON project_refunds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_refunds_update_draft" ON project_refunds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 5. PROJECT DISBURSEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS project_disbursements (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID    NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id   UUID    REFERENCES work_orders(id) ON DELETE RESTRICT,
  company_id      TEXT    NOT NULL DEFAULT 'rc-art',

  payment_type    TEXT    NOT NULL DEFAULT 'check'
                    CHECK (payment_type IN ('check','cash','transfer','card')),
  beneficiary     TEXT    NOT NULL DEFAULT '',
  description     TEXT    NOT NULL DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),

  payment_date        DATE,
  reference_number    TEXT NOT NULL DEFAULT '',
  receipt_image_url   TEXT NOT NULL DEFAULT '',

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','paid','cancelled')),
  approved_by     TEXT NOT NULL DEFAULT '',
  approved_at     TIMESTAMPTZ,

  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_disbursements_project_id ON project_disbursements(project_id);

CREATE OR REPLACE FUNCTION prevent_disbursement_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RULE: Cannot delete project disbursements. Set status to ''cancelled'' instead.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_disbursement_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount        IS DISTINCT FROM NEW.amount        OR
     OLD.project_id    IS DISTINCT FROM NEW.project_id    OR
     OLD.work_order_id IS DISTINCT FROM NEW.work_order_id OR
     OLD.payment_date  IS DISTINCT FROM NEW.payment_date  OR
     OLD.beneficiary   IS DISTINCT FROM NEW.beneficiary   OR
     OLD.payment_type  IS DISTINCT FROM NEW.payment_type
  THEN
    RAISE EXCEPTION 'RULE: Cannot modify historical disbursement fields. Create a new record or set status to cancelled.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_project_disbursements ON project_disbursements;
CREATE TRIGGER trg_no_delete_project_disbursements
BEFORE DELETE ON project_disbursements
FOR EACH ROW EXECUTE FUNCTION prevent_disbursement_delete();

DROP TRIGGER IF EXISTS trg_no_update_project_disbursements ON project_disbursements;
CREATE TRIGGER trg_no_update_project_disbursements
BEFORE UPDATE ON project_disbursements
FOR EACH ROW EXECUTE FUNCTION prevent_disbursement_update();

ALTER TABLE project_disbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_disbursements_select_draft" ON project_disbursements;
DROP POLICY IF EXISTS "project_disbursements_insert_draft" ON project_disbursements;
DROP POLICY IF EXISTS "project_disbursements_update_draft" ON project_disbursements;
CREATE POLICY "project_disbursements_select_draft" ON project_disbursements FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_disbursements_insert_draft" ON project_disbursements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_disbursements_update_draft" ON project_disbursements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 6. INVESTOR COMPANIES
-- ============================================================

CREATE TABLE IF NOT EXISTS investor_companies (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT  NOT NULL DEFAULT 'rc-art',

  company_name    TEXT  NOT NULL CHECK (company_name <> ''),
  contact_person  TEXT  NOT NULL DEFAULT '',
  email           TEXT  NOT NULL DEFAULT '',
  phone           TEXT  NOT NULL DEFAULT '',
  license_number  TEXT  NOT NULL DEFAULT '',
  state           TEXT  NOT NULL DEFAULT '',
  notes           TEXT  NOT NULL DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_companies_company_id ON investor_companies(company_id);

DROP TRIGGER IF EXISTS trg_investor_companies_updated_at ON investor_companies;
CREATE TRIGGER trg_investor_companies_updated_at
BEFORE UPDATE ON investor_companies
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE investor_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investor_companies_select_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_insert_draft" ON investor_companies;
DROP POLICY IF EXISTS "investor_companies_update_draft" ON investor_companies;
CREATE POLICY "investor_companies_select_draft" ON investor_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "investor_companies_insert_draft" ON investor_companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "investor_companies_update_draft" ON investor_companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 7. INVESTORS
-- ============================================================
-- Note: original TWO column `company_id UUID REFERENCES investor_companies`
--       renamed to `investor_company_id` to avoid collision with
--       MAIN's `company_id TEXT` tenant marker column

CREATE TABLE IF NOT EXISTS investors (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT  NOT NULL DEFAULT 'rc-art',

  name                TEXT  NOT NULL CHECK (name <> ''),
  type                TEXT  NOT NULL DEFAULT 'person'
                        CHECK (type IN ('person', 'company')),
  investor_company_id UUID  REFERENCES investor_companies(id) ON DELETE RESTRICT,
  email               TEXT  NOT NULL DEFAULT '',
  phone               TEXT  NOT NULL DEFAULT '',
  status              TEXT  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
  notes               TEXT  NOT NULL DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investors_company_id          ON investors(company_id);
CREATE INDEX IF NOT EXISTS idx_investors_investor_company_id ON investors(investor_company_id);
CREATE INDEX IF NOT EXISTS idx_investors_status              ON investors(status);

DROP TRIGGER IF EXISTS trg_investors_updated_at ON investors;
CREATE TRIGGER trg_investors_updated_at
BEFORE UPDATE ON investors
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investors_select_draft" ON investors;
DROP POLICY IF EXISTS "investors_insert_draft" ON investors;
DROP POLICY IF EXISTS "investors_update_draft" ON investors;
CREATE POLICY "investors_select_draft" ON investors FOR SELECT TO authenticated USING (true);
CREATE POLICY "investors_insert_draft" ON investors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "investors_update_draft" ON investors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 8. PROJECT INVESTORS (join table)
-- ============================================================
-- Adaptation: project_id TEXT FK → UUID FK

CREATE TABLE IF NOT EXISTS project_investors (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID  NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  investor_id UUID  NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
  company_id  TEXT  NOT NULL DEFAULT 'rc-art',

  role                    TEXT NOT NULL DEFAULT 'equity_partner'
                            CHECK (role IN ('lead_contractor','equity_partner','silent_partner','other')),
  ownership_percentage    NUMERIC(5,2)
                            CHECK (ownership_percentage IS NULL OR (ownership_percentage >= 0 AND ownership_percentage <= 100)),
  profit_split_percentage NUMERIC(5,2)
                            CHECK (profit_split_percentage IS NULL OR (profit_split_percentage >= 0 AND profit_split_percentage <= 100)),
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','cancelled')),
  agreement_notes         TEXT NOT NULL DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, investor_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_investors_project_id  ON project_investors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_investors_investor_id ON project_investors(investor_id);

DROP TRIGGER IF EXISTS trg_project_investors_updated_at ON project_investors;
CREATE TRIGGER trg_project_investors_updated_at
BEFORE UPDATE ON project_investors
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE project_investors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_investors_select_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_insert_draft" ON project_investors;
DROP POLICY IF EXISTS "project_investors_update_draft" ON project_investors;
CREATE POLICY "project_investors_select_draft" ON project_investors FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_investors_insert_draft" ON project_investors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_investors_update_draft" ON project_investors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 9. CAPITAL CONTRIBUTIONS
-- ============================================================
-- Adaptation: project_id TEXT FK → UUID FK
-- RULE: amount ALWAYS > 0
-- RULE: No hard delete (trigger enforced)
-- RULE: No UPDATE on historical fields (trigger enforced)

CREATE TABLE IF NOT EXISTS capital_contributions (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID  NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  investor_id UUID  NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
  company_id  TEXT  NOT NULL DEFAULT 'rc-art',

  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE          NOT NULL,
  method      TEXT          NOT NULL DEFAULT 'wire'
                CHECK (method IN ('cash','wire','check','company_payment')),
  type        TEXT          NOT NULL DEFAULT 'initial'
                CHECK (type IN ('initial','additional','closing','reimbursement')),
  status      TEXT          NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','cancelled')),
  evidence_reference TEXT   NOT NULL DEFAULT '',
  notes              TEXT   NOT NULL DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_contributions_project_id  ON capital_contributions(project_id);
CREATE INDEX IF NOT EXISTS idx_capital_contributions_investor_id ON capital_contributions(investor_id);

DROP TRIGGER IF EXISTS trg_capital_contributions_updated_at ON capital_contributions;
CREATE TRIGGER trg_capital_contributions_updated_at
BEFORE UPDATE ON capital_contributions
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

CREATE OR REPLACE FUNCTION prevent_contribution_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RULE: Cannot delete capital contributions. Set status to ''cancelled'' instead.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_contribution_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount      IS DISTINCT FROM NEW.amount      OR
     OLD.date        IS DISTINCT FROM NEW.date        OR
     OLD.investor_id IS DISTINCT FROM NEW.investor_id OR
     OLD.project_id  IS DISTINCT FROM NEW.project_id
  THEN
    RAISE EXCEPTION 'RULE: Cannot modify contribution fields (amount, date, investor_id, project_id). Cancel and create a new record.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_capital_contributions ON capital_contributions;
CREATE TRIGGER trg_no_delete_capital_contributions
BEFORE DELETE ON capital_contributions
FOR EACH ROW EXECUTE FUNCTION prevent_contribution_delete();

DROP TRIGGER IF EXISTS trg_no_update_capital_contributions ON capital_contributions;
CREATE TRIGGER trg_no_update_capital_contributions
BEFORE UPDATE ON capital_contributions
FOR EACH ROW EXECUTE FUNCTION prevent_contribution_update();

ALTER TABLE capital_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capital_contributions_select_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_insert_draft" ON capital_contributions;
DROP POLICY IF EXISTS "capital_contributions_update_draft" ON capital_contributions;
CREATE POLICY "capital_contributions_select_draft" ON capital_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "capital_contributions_insert_draft" ON capital_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "capital_contributions_update_draft" ON capital_contributions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- No DELETE policy — trigger prevents it


-- ============================================================
-- 10. CAPITAL CALLS
-- ============================================================

CREATE TABLE IF NOT EXISTS capital_calls (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID   NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id   TEXT   NOT NULL DEFAULT 'rc-art',

  requested_amount NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
  reason           TEXT          NOT NULL CHECK (reason <> ''),
  due_date         DATE,
  status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled')),
  notes            TEXT          NOT NULL DEFAULT '',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_calls_project_id ON capital_calls(project_id);

DROP TRIGGER IF EXISTS trg_capital_calls_updated_at ON capital_calls;
CREATE TRIGGER trg_capital_calls_updated_at
BEFORE UPDATE ON capital_calls
FOR EACH ROW EXECUTE FUNCTION investor_set_updated_at();

ALTER TABLE capital_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capital_calls_select_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_insert_draft" ON capital_calls;
DROP POLICY IF EXISTS "capital_calls_update_draft" ON capital_calls;
CREATE POLICY "capital_calls_select_draft" ON capital_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "capital_calls_insert_draft" ON capital_calls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "capital_calls_update_draft" ON capital_calls FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 11. WORK ORDERS BRIDGE — MOVED TO SEPARATE FILE
-- ============================================================
-- ⚠️  NOT INCLUDED HERE — touches existing production table
-- Apply separately after reviewing:
--   20260610_investor_hub_work_orders_bridge_draft.sql


-- ============================================================
-- 12. DEFERRED — NOT INCLUDED IN THIS DRAFT
-- ============================================================
-- project_financial_summaries VIEW      — Phase 6
-- flip_analyses TABLE                   — Phase 6
-- user_roles TABLE (from TWO)           — excluded (conflicts with app_roles)
-- auth_role() / is_owner() (from TWO)   — excluded
-- RLS hardening (app_roles-based)       — Phase 6
-- prevent_non_owner_financial_update    — Phase 6 (needs adapted auth_role)


-- ============================================================
-- END OF DRAFT MIGRATION v2
-- ============================================================
-- Tables created (all UUID PKs, all TO authenticated RLS):
--   projects              (id UUID + project_number TEXT UNIQUE)
--   project_expenses      (immutable triggers)
--   project_refunds       (immutable triggers)
--   project_disbursements (immutable triggers)
--   investor_companies
--   investors             (investor_company_id renamed from company_id)
--   project_investors     (join table)
--   capital_contributions (immutable + no-delete triggers)
--   capital_calls
--
-- NOT applied to production.
-- NOT connected to any React UI.
-- NOT activating Investor Hub feature flag.
-- work_orders bridge: separate file.
-- ============================================================
