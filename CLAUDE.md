# CLAUDE.md — NexArtPro Guía de Agente

> Este archivo es leído automáticamente por Claude Code en cada sesión.
> Leerlo completo antes de tocar cualquier archivo.
> Versión actualizada: 2026-07-27 — reconciliado contra el código real y contra `docs/fusion/FUSION_PHASES_STATUS.md`.
>
> Este archivo es la única fuente de verdad sobre **estado de fases**. Si `docs/fusion/FUSION_PHASES_STATUS.md`
> o cualquier otro doc dice algo distinto sobre qué fase está completa, ese otro doc está desactualizado —
> corregirlo para que coincida con esto, no al revés. Para reglas operativas del día a día (prioridades,
> gaps abiertos, mapa técnico) ver `docs/agent/` — ese árbol se mantiene aparte y se actualiza más seguido.

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
- tax_id, address, city, state, zip, tax_notes — aplicado en `20260628_investors_tax_address.sql`

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
  ProjectNew.jsx        — wizard de 3 pasos (Basic Info / Acquisition / Closing Costs), un solo
                          useForm + zod, valida por paso con trigger() antes de avanzar. NOTA:
                          earnest_money y arv NO se piden aqui — no existen como columnas en
                          `projects` (arv vive en `flip_analyses`, capturado en el tab Flip
                          Analysis despues de crear el proyecto)
  ProjectDetail.jsx     — shell con 5 tabs + Outlet
  ProjectOverview.jsx   — tab overview
  ProjectFinancials.jsx — tab financials
  ProjectInvestors.jsx  — tab investors (Add Investor habilitado)
  ProjectCapital.jsx    — tab capital contributions
  FlipAnalysis.jsx      — tab flip analysis, wired a datos reales (useQuery + useMutation)

src/pages/investors/
  Investors.jsx         — lista con busqueda
  InvestorNew.jsx       — form completo: name/type/phone/email/address/city/state/zip +
                          tax_id/tax_notes/notes (mejora ya aplicada)

src/components/projects/
  ProjectCard.jsx
  ProjectFinancialSummary.jsx
  InvestorTable.jsx     — usa ownership_percentage (NO equity_pct)
  CapitalContributionForm.jsx
  FlipAnalysisForm.jsx  — form react-hook-form + zod para crear/editar flip_analyses
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

Reconciliado 2026-07-27 contra el codigo real (`src/index.css`, `supabase/migrations/`, `.env.local`)
y contra `docs/fusion/FUSION_PHASES_STATUS.md`. Las filas marcadas "PENDIENTE" son las unicas que
siguen abiertas de verdad.

| Fase | Descripcion | Estado |
|---|---|---|
| 0 | Baseline + build limpio | Completo |
| 0.5 | Rename base44 -> nexartClient | Completo |
| 1 | Estetica V3 tokens CSS | Completo — tokens `--nexart-ink-*`/`--nexart-burnt-*` en `src/index.css` |
| 2 | Layout polish V3 | Completo |
| 3 | Shell Projects / Investor Hub | Completo |
| 4 | Schema SQL Investor Hub | Completo (en produccion) |
| 5 | UI React wired a datos reales | Completo |
| 5.5 | Wizard ProjectNew (3 pasos) | Completo — 2026-07-27, sin earnest_money/arv (no son columnas de `projects`) |
| 5.6 | InvestorNew mejorado (tax_id, address) | Completo |
| 5.7 | FlipAnalysis create/edit form | Completo — `FlipAnalysisForm.jsx` |
| 5.8 | Work Order -> Project selector | Completo — 2026-07-27, tarjeta "Job Details" en `WorkOrderDetail.jsx` |
| 6 | Bridge Projects <-> Work Orders | Completo — `flip_analyses` + `work_orders.project_id` aplicados en produccion (2026-06-13) |
| 7 | QA final y cleanup | Parcial. Route guard (`ProtectedRoute`) reactivado 2026-07-27. RLS del Investor Hub sigue en `anon_full_access` (revertido a proposito, ver TAREA H) — bloqueado en la fase 0 real: no existe autenticacion real de Supabase Auth en esta app (ver TAREA H) |

---

## 11. Proximas tareas (en orden)

Tareas A-E de la version anterior de este archivo ya estan implementadas (migration de campos
fiscales, wizard de ProjectNew, InvestorNew mejorado, FlipAnalysisForm, selector Work Order ->
Project) — se retiran de esta lista. TAREA F (RLS hardening Investor Hub) se intento, se revirtio
a proposito, y se reemplaza por TAREA H abajo, que es el bloqueador real.

### TAREA H — CRITICO Y BLOQUEANTE: esta app no tiene autenticacion real de Supabase Auth

Descubierto 2026-07-27 al intentar TAREA F. Hechos verificados:

- `grep` en todo `src/` no encuentra ninguna llamada a `signInWithPassword`, `signInWithOtp`,
  `signInWithOAuth` ni `signUp` — solo `supabase.auth.signOut()`. Nunca se crea una sesion real.
- `app_users` no tiene columna `auth_user_id` (confirmado con SQL directo), aunque
  `AuthContext.jsx` intenta consultarla — ese codigo nunca llega a ejecutarse con exito.
- El login real y unico que funciona es `TeamAccess.jsx`: un codigo de equipo hardcodeado
  (`TEAM_ACCESS_CODE` en el bundle del frontend) + verificacion de usuario/password en texto
  plano contra `app_users` (`userStore.js` `authenticate()`, columna `password` sin hash) usando
  la anon key. Al pasar, solo se guardan banderas en `sessionStorage` — nunca un JWT.
- Consecuencia: **todas** las peticiones a Postgres de esta app, para cualquier usuario, llegan
  como rol `anon`. `auth.uid()` es siempre `NULL`. Esto hace que RLS por usuario/rol sea
  **imposible de aplicar de verdad** en esta app hasta que se conecte autenticacion real —
  verificado en carne propia: la correccion de TAREA F (`TO authenticated`) dejo el Investor Hub
  inaccesible para todos, admin incluido (`SET ROLE anon; SELECT count(*) FROM projects;` daba 0),
  y tuvo que revertirse (`supabase/migrations/20260727b_investor_hub_rls_emergency_revert.sql`).
- Ademas, `userStore.createUser()` no tiene ninguna validacion — con `app_users` en `anon_full_access`
  (que es el estado real hoy, ver TAREA G), cualquiera con la anon key puede insertarse una cuenta
  `role: 'admin'` directamente contra la base de datos, sin pasar por ningun login.

**Que se arreglo hoy (2026-07-27):** el bypass en `src/App.jsx` (`ProtectedRoute` que hacia
`return children` siempre, mas `/team-access` y `/login` redirigiendo a `/dashboard`) — estaba
ahi desde el primer commit de este repo (`5304dae`, 2026-06-09). Se restauro el guard real. Esto
es una mejora real (bloquea navegacion casual sin el codigo de equipo + password), pero **no
resuelve el problema de fondo**: la base de datos sigue sin poder distinguir un usuario real de
cualquiera con la anon key, porque nunca hay una sesion Postgres autenticada de por medio.

**No implementar la solucion real sin aprobacion explicita** — implica decidir entre conectar
Supabase Auth de verdad (requiere migrar usuarios existentes, cambiar el flujo de login, hashear
passwords) u otra estrategia. Es un cambio de arquitectura, no una tarea de una sesion.

### TAREA G — CRITICO: auditar `rls_policy_always_true` en el resto de la DB de produccion

Al intentar TAREA F (2026-07-27) se encontro que las tablas del Investor Hub tenian una policy
`anon_full_access` (`roles: {anon}`, `cmd: ALL`, `USING (true)`) dando acceso publico total sin
login — contradecia todo lo documentado. Se reabrio a proposito tras el hallazgo de TAREA H (ver
arriba) porque cerrarlo sin autenticacion real rompe la app — no se puede dar por resuelto hasta
que TAREA H este resuelta.

Ademas, `pg_policies` y el advisor de seguridad de Supabase muestran que el mismo patron
(`rls_policy_always_true`) existe en **121 policies** a lo largo de practicamente toda la base de
datos de produccion, incluyendo tablas sensibles: `app_users`, `bank_accounts`,
`bank_transactions`, `invoices`, `clients`, `subscriptions`, `recovery_vault`,
`security_audit_logs`, `payroll_entries`, `payroll_runs`, `work_orders`, `estimates`, `leads`,
entre otras.

**No tocar esto sin instruccion explicita nueva, y no antes de resolver TAREA H.** Es una
auditoria/remediacion propia, separada de cualquier fase de fusion — algunas de esas tablas
(`signing_packages`, `signing_participants`, `signing_events`, `company_config`) legitimamente
necesitan algo de acceso `anon` para el flujo
publico de NexArtSign/estimates, asi que esto requiere revision tabla por tabla, no un barrido
ciego. Requiere decision explicita del dueno del proyecto sobre prioridad y alcance antes de
iniciar.

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
Lee CLAUDE.md completo. Estamos trabajando en [TAREA H/G].
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

*Version: 2.1 — 2026-07-27*
*R.C Art Construction LLC — NexArtPro*
