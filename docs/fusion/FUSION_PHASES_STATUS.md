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
| **6** | **Bridge Projects ↔ Work Orders** | **🔄 En progreso** | `integration/projects-workorders-bridge` | — |
| 7 | QA final y cleanup | ⏸ Pendiente | `integration/final-cleanup` | — |

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

### 🔄 Fase 6 — Bridge Projects ↔ Work Orders

**Rama:** `integration/projects-workorders-bridge`  
**Estado:** En progreso  
**Objetivo:** Conectar Work Orders existentes con Projects.

**Decisiones críticas pendientes / tomadas:**

| Decisión | Estado |
|----------|--------|
| Añadir `work_orders.project_id UUID` | Bridge en `supabase/drafts/` — requiere aprobación explícita para aplicar |
| Crear tabla `flip_analyses` | Pendiente — diseñada en CLAUDE.md §8 Fase 5 |
| `actual_labor` alimenta `profit_neto` | A definir: ¿desde `work_order_expenses` o manual? |
| `project_financial_summaries` view | Deferred desde Phase 4 |

**Archivos a crear/modificar:**
```
supabase/migrations/20260613_flip_analyses.sql       ← nueva tabla
src/pages/projects/FlipAnalysis.jsx                  ← conectar a datos reales
src/pages/projects/ProjectFinancials.jsx             ← conectar a datos reales
src/components/projects/FlipAnalysisPanel.jsx        ← ya funciona con datos
```

**Regla crítica:** El bridge (`work_orders.project_id`) toca una tabla de producción existente.  
Requiere: 1) aprobación explícita del owner, 2) aplicar SOLO DESPUÉS de confirmar que `flip_analyses` y `project_financials_summary` están validados.

---

### ⏸ Fase 7 — QA Final y Cleanup

**Rama:** `integration/final-cleanup`  
**Estado:** No iniciada

**PRs en orden:**
1. PR baseline + documentación
2. PR rename base44 → nexartClient
3. PR theme tokens V3
4. PR layout polish
5. PR feature flags + project shell
6. PR investor schema + RLS + QA
7. PR investor React UI
8. PR projects/work orders bridge
9. PR cleanup final

---

## Estado del repo en esta sesión

```
Branch activo:   integration/investor-hub-react-ui
Último commit:   1c98091 — Phase 5 complete
Working tree:    limpio
Bridge:          supabase/drafts/ (NO en migrations)
Producción:      intacta — solo tablas nuevas añadidas
Feature flag:    VITE_INVESTOR_HUB_ENABLED=false (app → no muestra Projects)
Dev server:      npm run dev → localhost:5173
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
