-- Migration: 20260506_financial_projects_system.sql

-- 1. Create Projects Table
CREATE SEQUENCE IF NOT EXISTS project_seq START 1000;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT ('PRJ-' || nextval('project_seq')::TEXT),
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  purchase_date DATE,
  status TEXT DEFAULT 'Active',
  responsible TEXT DEFAULT '',
  purchase_price NUMERIC DEFAULT 0,
  down_payment NUMERIC DEFAULT 0,
  realtor_fee NUMERIC DEFAULT 0,
  loan_amount NUMERIC DEFAULT 0,
  title_company TEXT DEFAULT '',
  closing_costs NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Alter Work Orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS expenses_total NUMERIC DEFAULT 0;

-- 3. Create Expenses Table
CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id TEXT REFERENCES work_orders(id) ON DELETE RESTRICT,
  vendor TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  date DATE DEFAULT CURRENT_DATE,
  category TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Refunds Table
CREATE TABLE IF NOT EXISTS project_refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id TEXT REFERENCES work_orders(id) ON DELETE RESTRICT,
  expense_id UUID REFERENCES project_expenses(id) ON DELETE RESTRICT,
  vendor TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Disbursements Table
CREATE TABLE IF NOT EXISTS project_disbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  work_order_id TEXT REFERENCES work_orders(id) ON DELETE RESTRICT,
  type TEXT DEFAULT 'Check',
  payee TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  date DATE DEFAULT CURRENT_DATE,
  document_url TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Financial Summaries View
CREATE OR REPLACE VIEW project_financial_summaries AS
SELECT 
    p.id AS project_id,
    p.name,
    COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id = p.id AND status != 'Cancelled'), 0) AS total_expenses,
    COALESCE((SELECT SUM(amount) FROM project_refunds WHERE project_id = p.id AND status != 'Cancelled'), 0) AS total_refunds,
    COALESCE((SELECT SUM(amount) FROM project_disbursements WHERE project_id = p.id AND status != 'Cancelled'), 0) AS total_disbursements,
    (COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id = p.id AND status != 'Cancelled'), 0) - 
     COALESCE((SELECT SUM(amount) FROM project_refunds WHERE project_id = p.id AND status != 'Cancelled'), 0)) AS net_cost
FROM projects p;

-- 7. RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_disbursements ENABLE ROW LEVEL SECURITY;

-- NOTA IMPORTANTE: Las policies FOR ALL USING (true) son temporales para MVP/single-tenant.
-- Antes de producción, estas tablas financieras deben ser admin/internal-only.
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for project_expenses" ON project_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for project_refunds" ON project_refunds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for project_disbursements" ON project_disbursements FOR ALL USING (true) WITH CHECK (true);
