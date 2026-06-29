# CLAUDE.md — NexArtPro Guía de Agente

> Este archivo es leído automáticamente por Claude Code en cada sesión.
> Leerlo completo antes de tocar cualquier archivo.
> Versión actualizada: Junio 2026 — refleja estado real del proyecto.

---

## 1. Identidad del proyecto

**Nombre:** NexArtPro
**Empresa:** R.C Art Construction LLC — Oregon CCB #247277
**Tipo:** SaaS de gestión operativa para contratistas de construcción y house flipping
**Estado:** En producción en Vercel. Investor Hub activo (VITE_INVESTOR_HUB_ENABLED=true).
**Supabase proyecto:** `hdiejuqbhqhebrpneymo` (producción)

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| UI Components | shadcn/ui + Radix UI |
| Estilos | Tailwind CSS v3 + CSS variables HSL |
| Routing | React Router DOM v6 (nested routes + Outlet) |
| Data fetching | TanStack Query v5 (useQuery, useMutation, useQueryClient) |
| Forms | react-hook-form + zod |
| Base de datos | Supabase PostgreSQL con RLS |
| Deploy | Vercel (auto-deploy desde main) |

---

## 3. Cliente de datos — nexartClient (REGLA MAS IMPORTANTE)

**Archivo:** `src/api/nexartClient.js`

NUNCA usar `supabase` directamente en componentes. SIEMPRE usar `nexartClient`.

```js
import { nexartClient } from '@/api/nexartClient';

const items  = await nexartClient.entities.Project.list('-created_at', 200);
const rows   = await nexartClient.entities.Investor.filter({ status: 'active' }, '-created_at', 100);
const row    = await nexartClient.entities.ProjectInvestor.filter({ project_id }, '-created_at', 100, '*, investor:investors(id,name)');
const created = await nexartClient.entities.Project.create({ company_id: 'rc-art', ...data });
await nexartClient.entities.Project.update(id, { status: 'active' });
```

**Entidades del Investor Hub (nuevas):**

| Entidad | Tabla |
|---|---|
| Project | projects |
| ProjectInvestor | project_investors |
| Investor | investors |
| CapitalContribution | capital_contributions |
| FlipAnalysis | flip_analyses |
| CapitalCall | capital_calls |

---

## 4. Reglas criticas — nunca violar

- `nexartClient` siempre — nunca `supabase` crudo en componentes
- `company_id: 'rc-art'` en todos los `.create()`
- Soft delete siempre (`deleted_at`) — nunca hard DELETE desde frontend
- Formulas financieras van en `src/lib/` — nunca inline en componentes
- Formularios: `react-hook-form` + `zod` obligatorio
- Iconos: solo `lucide-react`
- RLS habilitado en todas las tablas nuevas desde el dia 1
- NO correr `npm run lint:fix` — solo verificar: `eslint <archivo>`
- NO tocar `work_orders` sin aprobacion explicita
- NO tocar `src/components/ui/` (shadcn) sin necesidad
- NO activar nuevas features en Vercel sin QA previo

---

## 5. Advertencias criticas de archivos (Windows NTFS)

**PROBLEMA CONFIRMADO:** Los archivos que contienen caracteres unicode (box-drawing: U+2500, U+2550, etc.) se TRUNCAN cuando se usa el Edit tool o sed en el mount NTFS de Linux.

Archivos afectados conocidos:
- `src/components/layout/Sidebar.jsx` (tiene comentarios con caracteres especiales)
- Cualquier archivo con `─`, `═`, `┌`, `└` en comentarios

**Solucion:** Siempre usar Write tool completo o bash heredoc para estos archivos. NUNCA usar Edit tool ni sed en ellos.

**OTRO PROBLEMA:** `sed -i` en archivos JSX sobre NTFS puede truncar el archivo si el patron tiene caracteres especiales. Verificar siempre con `wc -l` y `tail` despues de cualquier sed.

---

## 6. Schema — Estado actual de DB (produccion)

### Tablas del Investor Hub (todas aplicadas)

**projects** — Flip properties
- Campos clave: name, address, project_number (auto), status, responsible, purchase_date
- Financials acquisition: purchase_price, down_payment, loan_amount, realtor_fee, title_company, title_company_fee, closing_costs, inspection_fee, insurance
- Financials sale: sale_price, selling_agent_commission, seller_closing_costs
- Parties: buying_agent, buying_agent_company, selling_agent, lender_name, lender_contact
- Property: property_type, beds, baths, sqft, year_built

**investors** — Capital partners
- name, type (person/company), email, phone, status (active/inactive), notes
- PENDIENTE migration: tax_id, address, city, state, zip, tax_notes

**project_investors** — Link investor a proyecto
- CAMPOS REALES: `ownership_percentage`, `profit_split_percentage` (NO usar `equity_pct` — ese nombre NO existe en DB)
- role: equity_partner, lead_contractor, silent_partner, other
- status: pending, confirmed, cancelled

**capital_contributions** — Aportes de capital
- investor_id, project_id, amount, method, status, date, notes

**flip_analyses** — Analisis de flip versionados
- purchase_price, loan_amount, earnest_money, arv, commission_pct, closing_costs, renovation_budget
- actual_labor, actual_materials, actual_services, draws_received

---

## 7. Formulas financieras (src/lib/projectsApi.js)

```js
// R8 — Balance Due (efectivo aportado al cierre)
balance_due = purchase_price + closing_costs - loan_amount + earnest_money

// R9 — Profit Gross
commission_usd = arv * (commission_pct / 100)
profit_gross = arv - purchase_price - closing_costs - commission_usd

// R10 — Profit Neto
profit_neto = profit_gross - actual_labor - actual_materials - actual_services + draws_received

// R11 — Reparto por socio
reparto = profit_neto * (profit_split_percentage / 100)
```

---

## 8. Estructura de archivos — Investor Hub

```
src/pages/projects/
  Projects.jsx          — lista con grid de cards
  ProjectNew.jsx        — form de creacion (wizard 3 pasos PENDIENTE)
  ProjectDetail.jsx     — shell con 5 tabs + Outlet
  ProjectOverview.jsx   — tab overview
  ProjectFinancials.jsx — tab financials
  ProjectInvestors.jsx  — tab investors (Add Investor habilitado)
  ProjectCapital.jsx    — tab capital contributions
  FlipAnalysis.jsx      — tab flip analysis

src/pages/investors/
  Investors.jsx         — lista con busqueda
  InvestorNew.jsx       — form de registro (2 secciones PENDIENTE mejorar)

src/components/projects/
  ProjectCard.jsx
  ProjectFinancialSummary.jsx
  InvestorTable.jsx     — usa ownership_percentage (NO equity_pct)
  CapitalContributionForm.jsx
  FlipAnalysisPanel.jsx
  AddInvestorSheet.jsx  — Sheet para linkear investor a proyecto

src/lib/
  projectsApi.js        — formulas R8-R11 + STATUS_LABELS/COLORS
  investorsApi.js       — getTotalEquityPct (usa ownership_percentage)
  financialsApi.js      — buildFinancialSummary, re-exports formulas
```

---

## 9. Rutas activas

```
/projects              — Projects.jsx
/projects/new          — ProjectNew.jsx
/projects/:id          — ProjectDetail.jsx (con nested routes)
  /projects/:id        — ProjectOverview.jsx (index)
  /projects/:id/financials    — ProjectFinancials.jsx
  /projects/:id/investors     — ProjectInvestors.jsx
  /projects/:id/capital       — ProjectCapital.jsx
  /projects/:id/flip-analysis — FlipAnalysis.jsx
/investors             — Investors.jsx
/investors/new         — InvestorNew.jsx
```

---

## 10. Estado de fases

| Fase | Descripcion | Estado |
|---|---|---|
| 0 | Baseline + build limpio | Completo |
| 0.5 | Rename base44 -> nexartClient | Completo |
| 1 | Estetica V3 tokens CSS | PENDIENTE |
| 2 | Layout polish V3 | PENDIENTE |
| 3 | Shell Projects / Investor Hub | Completo |
| 4 | Schema SQL Investor Hub | Completo (en produccion) |
| 5 | UI React wired a datos reales | Completo |
| 5.5 | Wizard ProjectNew (3 pasos) | PENDIENTE |
| 5.6 | InvestorNew mejorado (tax_id, address) | PENDIENTE |
| 5.7 | FlipAnalysis create/edit form | PENDIENTE |
| 5.8 | Work Order -> Project selector | PENDIENTE |
| 6 | Bridge Projects <-> Work Orders | PENDIENTE (requiere aprobacion) |
| 7 | QA final y cleanup | PENDIENTE |

---

## 11. Proximas tareas (en orden)

### TAREA A — Migration: investors campos fiscales/direccion
```sql
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS tax_id    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_notes TEXT NOT NULL DEFAULT '';
```
Archivo: `supabase/migrations/20260628_investors_tax_address.sql`

### TAREA B — ProjectNew wizard 3 pasos
Archivo: `src/pages/projects/ProjectNew.jsx`
- Step 1: name, address, property_type, beds, baths, sqft, year_built, status, responsible
- Step 2: purchase_price, purchase_date, down_payment, loan_amount, lender_name, earnest_money, arv
- Step 3: title_company, title_company_fee, realtor_fee, closing_costs, inspection_fee, insurance
- Al submit: nexartClient.entities.Project.create() con todos los campos
- Redirigir a /projects/:id despues de crear

### TAREA C — InvestorNew mejorado (despues de migration)
Archivo: `src/pages/investors/InvestorNew.jsx`
- Seccion 1: name, type, phone, email, address, city, state, zip
- Seccion 2: tax_id (SSN/EIN), tax_notes, notes
- El capital aportado NO va aqui — va en Capital Contributions

### TAREA D — FlipAnalysis create form
Archivo: `src/pages/projects/FlipAnalysis.jsx` o nuevo `FlipAnalysisNew.jsx`
Campos del nexartwo investor-manager.js:
- purchase_price, earnest_deposit, closing_costs
- loan_amount, loan_rate_annual, loan_months
- property_taxes_6m, insurance_6m
- estimated_repairs, contingency_percent
- arv, realtor_commission_percent, title_escrow_exit
- Al guardar: calcula profit_gross, profit_neto automaticamente

---

## 12. Modulos en produccion — NO romper

| Modulo | Rutas | Estado |
|---|---|---|
| Estimates | /estimates, /estimate-editor, /send-estimate | Produccion |
| Work Orders | /work-orders, /work-orders/:id, /field | Produccion |
| Invoices | /invoices, /invoice-create | Produccion |
| Proposals | /proposals, /proposal-editor | Produccion |
| NexArtSign | /nexartsign, /sign/:token | Produccion |
| Workers | /workers | Produccion |
| Payroll | /payroll | Produccion |
| Payments | /payments | Produccion |

---

## 13. Como iniciar cada sesion en Claude Code

```
Lee CLAUDE.md completo. Estamos trabajando en [TAREA A/B/C/D].
Confirma la tarea, los archivos que vas a tocar, y espera aprobacion antes de editar.
```

**Regla de sesion:**
- Una tarea por sesion
- Terminar con `npm run build` sin errores
- Verificar ESLint: `npx eslint src/archivo.jsx`
- Commit con mensaje descriptivo antes de cerrar

---

## 14. Variables de entorno

```env
VITE_SUPABASE_URL=https://hdiejuqbhqhebrpneymo.supabase.co
VITE_SUPABASE_ANON_KEY=[ver .env.local]
VITE_INVESTOR_HUB_ENABLED=true
```

---

*Version: 2.0 — Junio 2026*
*R.C Art Construction LLC — NexArtPro*
