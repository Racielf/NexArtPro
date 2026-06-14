# NexArtPro — Fusion Phases Status
**Proyecto:** NexArtPro — R.C Art Construction LLC  
**Repo base:** `02-working-main/NexArtPro-main`  
**Rama activa:** ver tabla abajo  
**Última actualización:** 2026-06-13

> Este archivo es la fuente de verdad para el estado de la fusión de los tres repos.
> Actualizar al cerrar cada fase. Leer al inicio de cada sesión.

---

## Resumen ejecutivo

| Fase | Nombre | Estado | Rama | Commit(s) clave |
|------|--------|--------|------|-----------------|
| 0 | Baseline + env check | ✅ Completa | `master` | — |
| 0.5 | Rename base44 → nexartClient | ✅ Completa | `integration/base44-legacy-audit` | — |
| 1 | Estética V3 (tokens HSL) | ✅ Completa | `feature/v3-theme-tokens` | — |
| 2 | Layout polish V3 | ✅ Completa | `feature/v3-layout-polish` | — |
| 2.5 | Cream topbar + icon hover + CTA | ✅ Completa | `feature/v3-layout-polish` | — |
| 3 | Shell Projects / Investor Hub | ✅ Completa | `integration/projects-investor-shell` → merge | `184e8e1` |
| 4 | Schema SQL Investor Hub | ✅ Completa | `integration/investor-hub-schema` | `2b6740f` |
| 5 | UI React Investor Hub | ✅ Completa | `integration/investor-hub-react-ui` | `1c98091` |
| **6** | **Bridge Projects ↔ Work Orders** | **✅ Completa** | `integration/projects-workorders-bridge` | ver abajo |
| 7 | QA final y cleanup | ✅ Completa | `integration/final-cleanup` | ver abajo |

---

## Detalle por fase

### ✅ Fase 0 — Baseline

**Objetivo:** Confirmar que MAIN corre limpio.  
**Resultado:** Build pasa. Auth funciona. Rutas críticas cargan.  
**Notas:** `.env.local` creado con `sb_publishable_` key. `supabaseClient.js` tiene fallback hardcodeado → app funciona sin `.env`.

---

### ✅ Fase 0.5 — Rename base44 → nexartClient

**Objetivo:** Limpiar el nombre del cliente de datos.  
**Resultado:** ~156 archivos renombrados. `src/api/nexartClient.js` es el único cliente.  
**Notas:** El rename fue cosmético — cero cambios de lógica.

---

### ✅ Fase 1 — Estética V3 (tokens HSL)

**Archivo modificado:** `src/index.css` únicamente.  
**Resultado:** Paleta ink/cream/burnt aplicada. Sidebar oscuro. Topbar crema.  
**Tokens clave en `:root`:**
```css
--primary: 40 60% 50%          /* burnt-400 */
--sidebar-background: 228 57% 7% /* ink-950 */
--background: 43 25% 96%        /* cream suave */
--accent: 43 10% 93%
--secondary: 43 8% 93%
```
**Custom tokens disponibles:**
```css
--nexart-ink-950: 228 57% 7%;
--nexart-ink-900: 225 60% 9%;
--nexart-cream-50: 43 73% 94%;
--nexart-burnt-400: 40 60% 50%;
--nexart-burnt-500: 38 63% 44%;
```
**Nota:** Dark mode (`.dark`) NO se tocó. Es fase posterior.

---

### ✅ Fase 2 / 2.5 — Layout polish V3

**Archivos modificados:** `src/index.css`, `src/pages/Dashboard.jsx`  
**Resultado:**
- `dash-topbar`: background cream + blur `hsl(var(--nexart-cream-50) / 0.42)` + backdrop-filter
- `.sidebar-link:hover .sidebar-link-icon`: color cream en hover
- Botón CTA Estimates: eliminado `bg-blue-600` hardcoded → usa `--primary` del tema
- Fraunces: disponible como `--font-display` pero NO aplicada (no se encontró H1/H2 apropiado en Dashboard)

---

### ✅ Fase 3 — Shell Projects / Investor Hub

**Feature flag:** `VITE_INVESTOR_HUB_ENABLED=false` en `.env.local`  
**Rama de origen:** `integration/projects-investor-shell`  
**Commit clave:** `184e8e1`

**Archivos creados:**
```
src/pages/projects/
  Projects.jsx           ← lista de proyectos
  ProjectDetail.jsx      ← tabs de detalle (Outlet)
  ProjectOverview.jsx    ← tab Overview
  ProjectFinancials.jsx  ← tab Financials
  ProjectInvestors.jsx   ← tab Investors
  ProjectCapital.jsx     ← tab Capital
  FlipAnalysis.jsx       ← tab Flip Analysis

src/components/projects/
  ProjectCard.jsx
  ProjectFinancialSummary.jsx
  InvestorTable.jsx
  CapitalContributionForm.jsx
  FlipAnalysisPanel.jsx

src/lib/
  projectsApi.js         ← fórmulas R8-R11 + STATUS_LABELS/COLORS
  investorsApi.js        ← helpers equity, display names
  financialsApi.js       ← buildFinancialSummary + re-exports
```

**App.jsx:** rutas `/projects` y `/projects/:id/*` bajo `{INVESTOR_HUB_ENABLED && ...}`  
**Sidebar.jsx:** ítem Projects condicionado por flag

---

### ✅ Fase 4 — Schema SQL Investor Hub

**Commit:** `2b6740f`  
**Archivo:** `supabase/migrations/20260610_investor_hub_schema_applied.sql`  
**Estado:** Aplicado a producción (`nexartpro` / `hdiejuqbhqhebrpneymo`)

**9 tablas creadas:**
| Tabla | PK | Notas |
|-------|-----|-------|
| `projects` | UUID | `project_number` auto-gen vía trigger |
| `project_expenses` | UUID | Inmutabilidad trigger |
| `project_refunds` | UUID | Inmutabilidad trigger |
| `project_disbursements` | UUID | Inmutabilidad trigger |
| `investor_companies` | UUID | — |
| `investors` | UUID | — |
| `project_investors` | UUID | FK → projects + investors |
| `capital_contributions` | UUID | Inmutabilidad trigger |
| `capital_calls` | UUID | — |

**Funciones creadas:** `investor_set_updated_at()`, `generate_project_number()`, triggers de inmutabilidad financiera.  
**RLS:** `TO authenticated USING (true)` — scaffold de staging. Hardening en Phase 7.  
**Bridge:** `supabase/drafts/20260610_investor_hub_work_orders_bridge_draft.sql` — **NO aplicado**, requiere aprobación explícita.

**Documentación de validación:** `docs/fusion/INVESTOR_SCHEMA_LOCAL_VALIDATION_REPORT.md`

---

### ✅ Fase 5 — UI React Investor Hub

**Commit:** `1c98091`  
**Rama:** `integration/investor-hub-react-ui`

**Cambios en `nexartClient.js`:**
- 9 entidades nuevas en `TABLE_MAP`: `Project`, `ProjectExpense`, `ProjectRefund`, `ProjectDisbursement`, `InvestorCompany`, `Investor`, `ProjectInvestor`, `CapitalContribution`, `CapitalCall`
- `USES_AT_TIMESTAMPS` set: investor tables usan `created_at`/`updated_at`, no `created_date`/`updated_date`
- `filter()` acepta param `columns` para Supabase FK joins (e.g. `'*, investor:investors(id, name)'`)
- `create()` y `update()` eligen el campo de timestamp correcto según la tabla

**Páginas conectadas a datos reales:**
| Página | Data source | Patrón |
|--------|-------------|--------|
| `Projects.jsx` | `Project.list('-created_at')` | `useQuery` |
| `ProjectDetail.jsx` | `Project.filter({ id })` | `useQuery` → Outlet context |
| `ProjectInvestors.jsx` | `ProjectInvestor.filter` con join `investor:investors(...)` | `useQuery` |
| `ProjectCapital.jsx` | `CapitalContribution.filter` + `Investor.filter` | `useQuery` + `useMutation` |

**Pendiente de flip_analyses:** `ProjectFinancials.jsx` y `FlipAnalysis.jsx` muestran estado vacío — la tabla `flip_analyses` no existe todavía. Se crea en Phase 6.

---

### ✅ Fase 6 — Bridge Projects ↔ Work Orders

**Rama:** `integration/projects-workorders-bridge`  
**Estado:** Completa  
**Objetivo:** Conectar Work Orders con Projects + tabla flip_analyses + React UI.

**Migraciones aplicadas a producción (`hdiejuqbhqhebrpneymo`):**

| Migración | Aplicada | Descripción |
|-----------|----------|-------------|
| `20260613_flip_analyses.sql` | ✅ 2026-06-13 | Tabla `flip_analyses` (9 campos financieros + trigger updated_at + RLS) |
| `20260613_work_orders_project_bridge.sql` | ✅ 2026-06-13 | `ALTER TABLE work_orders ADD COLUMN project_id UUID` + índice |

**Archivos React creados/modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/api/nexartClient.js` | `FlipAnalysis: 'flip_analyses'` + `'flip_analyses'` en `USES_AT_TIMESTAMPS` |
| `src/components/projects/FlipAnalysisForm.jsx` | **Nuevo** — form react-hook-form + zod para análisis financiero |
| `src/pages/projects/FlipAnalysis.jsx` | Reescrito — useQuery + useMutation para `flip_analyses`, edición inline |
| `src/pages/projects/ProjectFinancials.jsx` | Reescrito — useQuery comparte cache `['flip-analyses', id]` con FlipAnalysis |

**Decisiones tomadas:**
- `actual_labor`/`materials`/`services` se capturan manualmente en `flip_analyses` (no se agrega desde `work_order_expenses` todavía — ese vínculo es Phase 6.5 o futura)
- `profit_gross` y `profit_neto` se calculan **client-side** en `buildFinancialSummary()` — no como columnas GENERATED en Postgres (evita conflictos en update)
- `project_financial_summaries` view → deferred a Phase 7 o standalone tarea futura
- Ambas tabs (Financials y Flip Analysis) comparten el mismo queryKey `['flip-analyses', project.id]` — una actualización invalida ambas

---

### ✅ Fase 7 — QA Final y Cleanup

**Rama:** `integration/final-cleanup`  
**Estado:** Completa

**Tareas completadas:**

| Tarea | Estado |
|-------|--------|
| `ProjectOverview.jsx` — wired flip_analyses (shared cache) | ✅ |
| Eliminar `supabase/drafts/` bridge draft obsoleto | ✅ |
| Activar `VITE_INVESTOR_HUB_ENABLED=true` para QA | ✅ |
| Build limpio con módulo activo | ✅ `✓ built in 6.12s` |
| Dev server QA — HTTP 200, Projects visible en sidebar | ✅ |
| RLS hardening draft en `supabase/drafts/20260613_investor_hub_rls_hardening_draft.sql` | ✅ Pendiente de aplicar |

**RLS hardening — pendiente de aplicar:**  
El draft en `supabase/drafts/20260613_investor_hub_rls_hardening_draft.sql` implementa:
- `admin` → acceso total a todas las tablas Investor Hub
- `office_agent` → SELECT en `projects` únicamente
- `field_agent` → sin acceso (bloqueado por RLS)

Usa `investor_user_role()` helper que lee `app_users.role` vía `auth.uid()`.  
**Antes de aplicar:** verificar que roles en `app_users` son `admin` / `office_agent` (no `administrador` / `capataz`).

**Branches para merge a master (en orden):**
1. `integration/rename-base44` (o ya mergeado)
2. `feature/v3-theme-tokens`
3. `feature/v3-layout-polish`
4. `integration/projects-investor-shell`
5. `integration/investor-hub-schema`
6. `integration/investor-hub-react-ui`
7. `integration/projects-workorders-bridge`
8. `integration/final-cleanup` ← este

---

## Estado del repo en esta sesión

```
Branch activo:   integration/final-cleanup
Último commit:   Phase 7 cleanup (ver git log)
Working tree:    limpio
Bridge:          supabase/migrations/ (aplicado a producción)
Producción:      11 tablas: 9 Investor Hub + flip_analyses + work_orders.project_id
Feature flag:    VITE_INVESTOR_HUB_ENABLED=true (QA activo)
RLS:             Scaffold (true) — hardening en supabase/drafts/ pendiente de aplicar
Dev server:      npm run dev → localhost:5173
Próximo paso:    Merge branches a master + aplicar RLS hardening tras validar roles
```

---

## Guardrails activos (leer antes de ejecutar cualquier Supabase MCP)

1. **Costo:** Si `create_project` requiere costo, PARAR y pedir aprobación.
2. **Docs git:** `03-docs/` está FUERA del repo. Usar `docs/fusion/` para documentación versionada.
3. **Bridge safety:** Verificar que el bridge NO esté en `supabase/migrations/` antes de cualquier `db reset`.
4. **Falla crítica:** Si falla una migración base, PARAR. No silenciar errores.
5. **Triple-check producción:** Target NUNCA debe ser `nexartpro` / `hdiejuqbhqhebrpneymo` sin aprobación explícita escrita.

---

## Credenciales y proyectos Supabase conocidos

| Proyecto | ID | Región | Uso |
|----------|----|--------|-----|
| `nexartpro` | `hdiejuqbhqhebrpneymo` | us-east-2 | **PRODUCCIÓN — máxima precaución** |
| `nexartwo-staging` | `switwhrtgcooemaqlmbw` | us-west-2 | NexArtWO staging — PKs TEXT, incompatible |
| `NexArtWO` | `udaeifoibydcokefcmbg` | us-east-1 | NexArtWO producción — off limits |
| `nexartsign-pro-app` | `fhxyhpxgjuftykhvsomb` | us-west-2 | NexArtSign — no tocar |
| `flipos` | `ddmeaykplksyamzffdya` | us-west-1 | FlipOS — no tocar |

---

*R.C Art Construction LLC — NexArtPro Fusion*  
*Actualizar este archivo al cerrar cada fase o sesión.*
