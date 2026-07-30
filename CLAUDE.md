# CLAUDE.md — NexArtPro Guía de Agente

> Este archivo es leído automáticamente por Claude Code en cada sesión.
> Leerlo completo antes de tocar cualquier archivo.
> Versión actualizada: 2026-07-30 — TAREA G cerrada por completo (el "batch 2" no existia, estaba
> mal contado), funciones SECURITY DEFINER expuestas de mas via RPC revocadas, NexArtSign Fase 6
> (minimizacion de `/verify-document`) resuelta, estrategia de eliminacion de Base44 documentada
> en `docs/agent/BASE44_REMOVAL_PLAN.md`, el link publico de Estimates arreglado (columnas
> faltantes en produccion + funcion nueva), y rediseño completo de Estimates confirmado como
> iniciativa futura propia (contexto en `docs/estimates-redesign-context.md`).
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
| 7 | QA final y cleanup | Parcial. Route guard reactivado 2026-07-27. Autenticacion real resuelta 2026-07-29 (TAREA H). RLS de toda la DB cerrada y verificada 2026-07-30 (TAREA G, completa salvo el lado publico de NexArtSign, diferido a proposito) — funciones SECURITY DEFINER con exposicion RPC de mas tambien cerradas el mismo dia |

---

## 11. Proximas tareas (en orden)

Tareas A-E de la version anterior de este archivo ya estan implementadas (migration de campos
fiscales, wizard de ProjectNew, InvestorNew mejorado, FlipAnalysisForm, selector Work Order ->
Project) — se retiran de esta lista. TAREA F (RLS hardening Investor Hub) se intento, se revirtio
a proposito, y se reemplaza por TAREA H abajo, que es el bloqueador real.

### TAREA H — Autenticacion real de Supabase Auth — RESUELTA Y VERIFICADA 2026-07-29

Descubierto 2026-07-27 al intentar TAREA F. Hechos verificados en su momento:

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

**Implementado 2026-07-28** (plan completo en `docs/agent/` no aplica — el plan vivio en
`C:\Users\racin\.claude\plans\cosmic-dreaming-bengio.md` de la sesion que lo hizo; resumen aqui):

- `app_users.auth_user_id` (UUID, referencia a `auth.users`) y `app_users.pin_hash` +
  `pin_failed_attempts` + `pin_locked_until` agregados
  (`supabase/migrations/20260728*.sql`).
- Las 2 cuentas reales de Supabase Auth que ya existian desde mayo (`racinllerf@gmail.com`,
  `rcartconstruction@gmail.com`) se vincularon a `admin` y `admin_test@example.com`.
- RLS de `app_users` cerrada de verdad: se encontraron ademas policies `TO public` que la
  auditoria original no habia detectado (ver TAREA G) — todas eliminadas, reemplazadas por
  policies `authenticated`-only (propia fila o `investor_user_role() = 'admin'`).
- 3 Edge Functions nuevas: `create-team-account` (admin invita por email real via
  `auth.admin.inviteUserByEmail`, reemplaza el insert directo sin validacion de
  `userStore.createUser`), `pin-login` (verifica PIN server-side, rota la password real y la
  entrega para que el cliente llame `signInWithPassword` — nunca inventa sesiones custom),
  `set-pin` (admin asigna/resetea PIN). La vieja `create-team-invite` (no autenticada, escribia
  en columnas que no existen) se dejo como stub 410 en produccion.
- `src/pages/TeamAccess.jsx` reescrito: sin codigo de equipo hardcodeado, login real por
  email+password o PIN, mas flujo de "olvide mi password" (`resetPasswordForEmail` +
  deteccion de evento `PASSWORD_RECOVERY`).
- `src/lib/userStore.js` reducido a `getUsers()`/`toggleUserActive()` — se eliminaron
  `authenticate()`, `createUser()`, `createRegistrationInvite()`, `completeRegistration()` (la
  raiz del hueco: cualquiera con la anon key podia insertarse una fila `role: 'admin'`).
- `src/components/settings/TeamAccessPanel.jsx` actualizado al nuevo flujo de invitacion +
  boton "Set PIN" por usuario con rol `agent`.

**Ajustado durante la verificacion en vivo (2026-07-29), por feedback directo del dueno:**

- El dueno no queria un flujo de invitacion por correo — quiere entrar el mismo con nombre +
  correo real del agente, que la cuenta quede activa al instante, y autorizar el acceso diario
  solo por PIN. Se cambio `create-team-account` de `auth.admin.inviteUserByEmail` a
  `auth.admin.createUser` (password aleatoria descartable, `email_confirm: true`) — ya no se
  manda ningun correo al crear una cuenta.
- El PIN ya no se escribe a mano: se pidio que se genere solo y que siempre incluya una letra.
  `set-pin`/`set-my-pin` generan un codigo de 6 caracteres (alfabeto sin ambiguos: sin `0/O/1/I/L`)
  garantizando al menos una letra, lo devuelven una sola vez en la respuesta para mostrarlo en
  pantalla (`TeamAccessPanel.jsx`, `TeamAccess.jsx`).
- Se agrego autoservicio: `set-my-pin` (nueva Edge Function) deja que un agente sin admin
  disponible resetee su propio PIN via el mismo link de "olvide mi password"
  (`resetPasswordForEmail`) — la sesion que ese link establece prueba que es dueno del correo,
  y desde ahi genera su propio PIN sin necesitar rol admin.

**2 bugs reales encontrados y corregidos durante la verificacion:**

1. `investor_user_role()` comparaba `app_users.id = auth.uid()`, pero la columna que de verdad
   coincide con una sesion real es `auth_user_id`, no `id` (la propia PK de `app_users`). Esto
   hacia que CUALQUIER chequeo de rol admin devolviera `NULL` siempre — quedo enmascarado hasta
   hoy porque nunca habia existido una sesion real para exponerlo. Sintoma: el admin solo veia su
   propia fila en Team & Access en vez de las 3. Corregido en
   `20260728d_fix_investor_user_role_column.sql`.
2. El evento `PASSWORD_RECOVERY` se escuchaba con un listener separado dentro de `TeamAccess.jsx`,
   registrado demasiado tarde — Supabase procesa el token de recovery de la URL apenas carga la
   pagina, antes de que el componente monte, y `onAuthStateChange` no reproduce eventos pasados a
   listeners nuevos. Se movio la deteccion a `AuthContext.jsx` (`isRecovery`/`clearRecovery`,
   expuesto via `useAuth()`), que es lo primero que monta en toda la app.

**Hallazgo adicional (no bug de codigo, config de infraestructura):** el mailer por defecto de
Supabase Auth (`noreply@mail.app.supabase.io`) **solo entrega a direcciones que son miembros del
equipo de la organizacion de Supabase** — cualquier otra direccion se descarta en silencio aunque
la API responda 200. Se conecto SMTP personalizado via Resend (`smtp.resend.com`, dominio
`rcartconstruction.com` ya verificado) desde el dashboard de Supabase — confirmado en logs de Auth
que el limite de envio subio de `2/hora` (mailer compartido) a `30/hora` (SMTP custom), sin
verificar entrega end-to-end de un correo nuevo todavia.

**Verificado 2026-07-29:** `auth.users.last_sign_in_at` poblado para `racinllerf@gmail.com` y
`yaymirc@gmail.com` (cuenta de prueba real creada durante la verificacion) — prueba directa de que
`auth.uid()` funciona para sesiones reales. `app_users.password` (texto plano) eliminada
(`20260729_drop_plaintext_password_column.sql`) — ya no la leia ni escribia ningun codigo.

**Siguiente paso natural:** retomar TAREA G (auditoria RLS del resto de la DB) ahora que
`auth.uid()` funciona de verdad — ya no deberia repetirse el problema de "arreglo que rompe la
app" que paso con el primer intento de TAREA F.

### TAREA G — Auditoria RLS del resto de la DB — CERRADA 2026-07-30 (salvo NexArtSign publico, diferido a proposito)

Al intentar TAREA F (2026-07-27) se encontro que las tablas del Investor Hub tenian una policy
`anon_full_access` (`roles: {anon}`, `cmd: ALL`, `USING (true)`) dando acceso publico total sin
login — contradecia todo lo documentado. `pg_policies` mostro el mismo patron en **~60 tablas**
(121 policies `rls_policy_always_true` + al menos 30 policies `TO public` adicionales que la
auditoria original no conto por buscar solo el rol literal `anon`).

**Batch 1 cerrado y verificado 2026-07-29** (24 tablas), ahora que TAREA H (auth real) esta resuelta:

- **Investor Hub (10 tablas)** — `projects`, `investors`, `investor_companies`,
  `project_investors`, `capital_contributions`, `capital_calls`, `flip_analyses`,
  `project_expenses`, `project_refunds`, `project_disbursements`. Solo se elimino
  `anon_full_access` — las policies `admin`/`agent` de TAREA F ya estaban bien, solo estaban
  neutralizadas por el bug de `investor_user_role()` (ya arreglado) y por `auth.uid()` no
  funcionando (ya arreglado).
- **CRM central (9 tablas)** — `clients`, `estimates`, `invoices`, `leads`, `proposals`,
  `work_orders`, `payroll_runs`, `payroll_entries`, `payments`. **Hallazgo critico evitado:**
  estas tablas tenian policies `users_own_X`/`*_owner_all` (`auth.uid() = user_id`) por debajo de
  `anon_full_access` que parecian una alternativa segura — pero asumen un modelo de "cada fila
  pertenece a un usuario individual", el equivocado para una sola empresa con equipo compartido.
  Verificado con datos reales: `estimates` tenia 27 filas, **0** con `user_id` puesto;
  `work_orders` 2 filas, 0 con `user_id`. Haber confiado en esas policies habria dejado casi todo
  el negocio invisible para todos — el mismo desastre del Investor Hub, pero en las tablas mas
  criticas. Se reemplazaron por policies de equipo compartido: `admin`/`agent` pueden
  SELECT/INSERT/UPDATE; **solo `admin` puede DELETE** (coincide con el soft-delete que ya usa la
  app — DELETE real desde el frontend nunca se usaba).
- **Financieras/infraestructura admin-only (4 tablas)** — `bank_accounts`, `bank_transactions`,
  `company_config`, `subscriptions`. Acceso total restringido a `investor_user_role() = 'admin'`
  (agentes sin acceso, coincide con que Settings ya es admin-only).
- **Personal (1 tabla)** — `profiles`: la policy existente (`auth.uid() = id`) SI es correcta aqui
  (es la fila de cuenta propia, no dato de negocio compartido) — solo se elimino `anon_full_access`.

Verificado con sesiones simuladas via `SET request.jwt.claims` (sin necesitar navegador): admin y
agent ven los mismos conteos reales de filas; agent correctamente bloqueado en tablas admin-only;
`anon` en 0 en las 24 tablas. Migraciones: `supabase/migrations/20260729b-e_*.sql`.

**Batches 4 y 5 cerrados y verificados 2026-07-29** (28 tablas mas):

- **Operativas de detalle (20 tablas)** — `appointments`, `customers`, `comm_events`,
  `job_assignments`, `materials`, `price_book_entries`, `services`, `time_entries`,
  `time_tracking_logs`, `work_order_daily_reports`, `work_order_expenses`, `work_order_histories`,
  `work_order_receipts`, `work_order_time_entries`, `worker_documents`, `worker_notes`, `workers`,
  `project_photos`, `estimate_snapshots`, `estimate_transmissions`, `estimate_version_histories`.
  Mismo patron que CRM central: `admin`/`agent` SELECT/INSERT/UPDATE, solo `admin` DELETE.
- **Logs/auditoria (8 tablas)** — `audit_logs`, `security_audit_logs`, `auth_security_logs`,
  `pricing_audit_events`, `document_logs`, `nexartsign_security_blocks`,
  `nexartsign_token_attempts`, `recovery_vault`. `src/lib/auditLog.js` escribe directo desde el
  frontend (no via service_role), asi que cualquier `admin`/`agent` activo puede INSERT (para que
  se registren sus propias acciones), pero **solo `admin` puede SELECT** (ver el historial) —
  coincide con que `/security-dashboard` y `/recovery-center` ahora son admin-only tambien
  (`access="owner"` agregado en `src/App.jsx`, antes sin proteger a nivel de ruta). Sin
  UPDATE/DELETE: los logs son append-only, ningun codigo del frontend los edita o borra.

**Hallazgo critico adicional durante batch 5, corregido el mismo dia:** al verificar que un agente
NO podia leer `audit_logs`, se encontro que SI podia — **34 tablas** tenian ademas una policy
`"Allow all for authenticated"` (`roles: {authenticated}`, `qual: true`) que la auditoria original
nunca busco (solo se habia buscado `anon` y `public`, nunca `authenticated` con `USING(true)`).
Esto anulaba por completo las restricciones ya aplicadas hoy en batches 2, 3, 4 y 5 —
`bank_accounts`/`bank_transactions` (deberian ser admin-only), `work_orders`/`payments`
(admin-only-delete), los logs (admin-only-read) — cualquier usuario autenticado, sin importar
rol, tenia acceso total via esta policy paralela. Se elimino de las 34 tablas
(`20260729h_rls_fix_allow_all_authenticated_bypass.sql`). Verificado: cero policies quedan en toda
la base con `roles={authenticated} AND qual=true`, y tambien cero con `qual=true` de cualquier
rol fuera de las 5 tablas de NexArtSign (deferred, ver abajo).

**Regresion causada y corregida en el mismo paso:** el fix anterior tambien quito la unica policy
`authenticated` que tenian las 5 tablas de NexArtSign (`signing_packages` etc.), dejando a los
usuarios internos sin poder ver sus propios paquetes de firma (admin paso de ver 10 filas reales a
0). Se restauro acceso de equipo compartido (`admin`/`agent`) en esas 5 tablas sin tocar las
policies `anon` (que siguen exactamente igual de abiertas, pospuestas a proposito) —
`20260729i_rls_restore_nexartsign_internal_access.sql`.

**Explicitamente fuera de este batch, mismo patron aplica despues:**

- NexArtSign publico: `signing_packages`, `signing_participants`, `signing_events`,
  `signing_certificates`, `public_document_access` — el lado `anon` (acceso publico real para el
  flujo de firma) sigue exactamente como estaba, sin tocar. Se solapan con `OPEN_GAPS.md` items 1-3
  (roadmap de seguridad de NexArtSign ya existente), coordinar con ese roadmap en vez de disenar
  de nuevo. Nota adicional: `signing_packages.anon_select_signing_packages` solo chequea
  `token IS NOT NULL` (no que el token coincida con nada) — revisar si de verdad protege algo mas
  alla de las Edge Functions que ya validan el token server-side.
- Ya verificadas como seguras y NO necesitan cambio: `change_orders`, `wo_communications`,
  `wo_documents`, `wo_line_items`, `wo_photos` (usan `roles: {public}` pero `qual: auth.role() =
  'authenticated'`, que es `false` para peticiones anonimas reales — no todo `TO public` es
  inseguro, se reviso el `qual` de cada tabla antes de asumir nada).

**Metodologia actualizada para la proxima tanda (importante):** al auditar RLS en esta base,
buscar SIEMPRE 3 patrones, no 2: `'anon' = ANY(roles)`, `roles = '{public}'`, Y
`roles = '{authenticated}' AND qual = 'true'` (o equivalente sin condicion real). El tercero se
descubrio recien hoy y ya afecto 34 tablas sin ser detectado por las 2 auditorias anteriores.

**Correccion 2026-07-30: "batch 2" ya no esta pendiente, estaba mal contado.** Se verifico en
vivo contra `pg_policies` en produccion (los 3 patrones de arriba) sobre las 64 tablas con RLS de
`public`. Resultado: la unica exposicion `anon`/`always true` que queda son las 5 tablas publicas
de NexArtSign (`signing_packages`, `signing_participants`, `signing_events`,
`signing_certificates`, `public_document_access`) — exactamente las que este documento y
`OPEN_GAPS.md` ya marcaban como diferidas a proposito. No existe ningun otro batch de tablas
pendiente de RLS por tabla. Cerrar esta tarea como completa (salvo el lado publico de NexArtSign,
coordinado con `docs/nexartsign-security-roadmap.md`).

**Hallazgo nuevo el mismo dia, distinto de RLS de tablas: funciones `SECURITY DEFINER`
ejecutables directo por `anon`/`authenticated` via `/rest/v1/rpc/...` sin necesitarlo.** El
security advisor de Supabase senalo 10 funciones callable por `anon`. Se verifico cada una
(`pg_get_functiondef` + grep de callers reales en `supabase/functions/`): los unicos callers son
Edge Functions en `supabase/functions/_shared/nexartsignSecurity.ts`, y **todas** usan
`createSupabaseAdmin()` (autentica con `service_role`, que ignora GRANTs de Postgres por
completo) — ningun caller legitimo necesitaba que `anon`/`authenticated` tuvieran `EXECUTE`.
3 de las 10 eran explotables de verdad (funciones normales, no triggers, sin chequeo de auth
adentro): `create_security_block` (cualquiera con la anon key podia bloquear el IP/fingerprint de
otra persona — griefing/DoS contra el flujo publico de firma), `write_security_audit_log`
(contaminar `security_audit_logs` con entradas falsas) y `record_nexartsign_token_attempt`
(falsificar intentos fallidos de otra persona, pudiendo disparar un bloqueo real contra una
victima). Las otras 6 tenian menor riesgo practico (funciones trigger que no ejecutan sentido
fuera de un trigger real, o de solo lectura) pero se cerraron igual por consistencia.
`investor_user_role()` se dejo intacta a proposito — la usan las policies de RLS de toda la app.

**Bug de la primera migracion, corregido en la misma sesion:** el primer intento
(`REVOKE EXECUTE ... FROM anon, authenticated`) fue un no-op — se verifico con
`has_function_privilege()` y seguia dando `true`. La causa: el permiso real venia del grant
implicito de Postgres a `PUBLIC` en cada funcion nueva (`pg_proc.proacl` mostraba `=X/postgres`,
sin fila explicita para `anon`/`authenticated`), no de un grant especifico a esos roles. Revocar
un rol especifico no quita lo que ese rol hereda de `PUBLIC`. La correccion fue
`REVOKE EXECUTE ... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role` explicito (por si acaso;
`service_role` ya tenia su propia fila en el ACL y no se ve afectado por revocar de PUBLIC).
Verificado con `has_function_privilege()` antes/despues de cada paso y con `get_advisors` — los 9
warnings `anon_security_definer_function_executable`/`authenticated_security_definer_function_executable`
para estas funciones ya no aparecen. Migracion:
`supabase/migrations/20260730_revoke_anon_rpc_security_definer_functions.sql`.

**Hallazgos del mismo barrido, NO resueltos hoy (una tarea por sesion), quedan en
`OPEN_GAPS.md`:** `function_search_path_mutable` (~20 funciones sin `SET search_path`),
`extension_in_public` (`pg_net` en schema public), `public_bucket_allows_listing` (bucket
storage `documents` permite listar todos los archivos), `auth_leaked_password_protection`
(deshabilitado en Supabase Auth).

Requiere decision explicita del dueno sobre prioridad para los hallazgos nuevos de arriba antes
de la siguiente tanda de trabajo en RLS/seguridad.

---

## 12. Modulos en produccion — NO romper

| Modulo | Rutas | Estado |
|---|---|---|
| Estimates | /estimates, /estimate-editor, /send-estimate | Produccion |
| Work Orders | /work-orders, /work-orders/:id, /field | Produccion — ver seccion 12.5, sistema externo de WO en desarrollo aparte se conectara aqui |
| Invoices | /invoices, /invoice-create | Produccion |
| Proposals | /proposals, /proposal-editor | Produccion |
| NexArtSign | /nexartsign, /sign/:token | Produccion |
| Workers | /workers | Produccion |
| Payroll | /payroll | Produccion |
| Payments | /payments | Produccion |

---

## 12.5. Modelo de roles actual y plan futuro de acceso por modulo

**Estado 2026-07-28:** `app_users.role` solo permite `admin`/`agent` (CHECK constraint,
`supabase/001_users_roles.sql`). `agent` se normaliza client-side a `office_agent`
(`src/lib/roleUtils.js`) — acceso operativo completo (Dashboard, Work Orders, Clientes,
Invoices, etc.) **excepto Settings**, que esta bloqueado a nivel de ruta (`access="owner"` en
`src/App.jsx`, solo `role === 'admin'`) y oculto en el sidebar (`Sidebar.jsx`, `isOwner`).

**Plan futuro confirmado por el dueno (2026-07-28), NO implementar todavia:** existe un sistema
de Work Orders separado, grande, en desarrollo aparte, que se conectara a NexArtPro mas adelante
(via API o el mecanismo que se defina). El dueno quiere poder habilitar **solo el modulo de Work
Orders** para ciertos agentes especificos (uno o varios), sin darles el resto del acceso
operativo — es decir, acceso por modulo, no solo por rol binario admin/agent.

**Que dejar preparado, sin construir todavia:**
- El modelo de roles de hoy (un solo campo `role` con 2 valores) no soporta esto. Cuando se
  aborde, probablemente necesite una tabla de permisos por modulo (ej. `app_user_module_access`)
  en vez de forzar mas valores dentro de `role`.
- No disenar nada nuevo en `app_users`/RLS/rutas que asuma que `role` es la unica fuente de
  autorizacion posible — dejar espacio para una capa de permisos por modulo encima.
- Cuando llegue esa integracion: definir el contrato de datos (que entra/sale por API hacia el
  sistema de Work Orders externo) antes de tocar `work_orders` en produccion (regla existente,
  seccion 4).

**NexArtSign — Fase 6 (minimizacion de `/verify-document`) resuelta 2026-07-30:** el Edge Function
publico `resolveSigningCertificate` devolvia nombre/email del firmante, su IP, el audit trail
completo y URLs directas al PDF firmado/fuente con solo un numero de certificado, sin login. Se
recorto la respuesta al minimo (numero de certificado, estado, fecha de firma, resultado de
verificacion de hash, proveedor) y se redeploy. Detalle completo en
`docs/nexartsign-security-roadmap.md` Fase 6 y `docs/agent/OPEN_GAPS.md` gap 2.

### Estimates — link publico arreglado 2026-07-30, rediseño completo confirmado como iniciativa futura

Al portar `resolveEstimatePublicToken` (ver Base44 abajo) se encontro la causa raiz de un bug real
en produccion: `estimates.public_share_token`/`public_share_token_created_at` no existian en la
tabla real, pese a que `estimateSalesLifecycle.js` (activo, no legacy) ya las necesitaba para
generar el link que se manda al cliente — el link jamas se podia generar. Se agregaron esas 2
columnas (migracion aditiva) y se desplego la funcion contra el schema real, verificado end-to-end.
Detalle en `docs/agent/BASE44_REMOVAL_PLAN.md`.

El dueno confirmo que quiere ademas un rediseño completo del modulo (armado del documento,
plantillas, adjuntos, integracion con NexArtSign, archivado/restauracion) en una sesion propia —
no se arranca hoy. Contexto completo capturado en `docs/estimates-redesign-context.md` y
`docs/agent/OPEN_GAPS.md` gap 11, para no perderlo antes de esa sesion.

### Eliminacion de Base44 del sistema — plan documentado 2026-07-30

El dueno pidio formalizar la estrategia (discutida antes, nunca documentada) de sacar el nombre y
la dependencia de Base44 del sistema mientras se sigue desarrollando. Inventario completo, tabla de
funciones, y plan por etapas en `docs/agent/BASE44_REMOVAL_PLAN.md` y `docs/agent/OPEN_GAPS.md`
gap 10. Resumen: no es solo branding — la migracion de `base44/functions/` a
`supabase/functions/` quedo a medias, y 7 funciones que el frontend sigue llamando
(`submitContactForm`, `resolveEstimatePublicToken`, `resolveAttachmentPublicUrl`,
`lowMarginAlert`, `approveMargin`, `agentTestRunner`, `sendSignedEstimateCopy`) fallan en
produccion hoy porque nunca se desplegaron del lado de Supabase. Se resolvio de paso una API key
de Base44 hardcodeada en `base44/.app.jsonc` desde el primer commit del repo.

**NexArtSign — decision de arquitectura confirmada por el dueno (2026-07-29):** se intento
desarrollar NexArtSign como proyecto separado, fuera de NexArtPro, y no funciono. Decision: seguir
desarrollando NexArtSign **dentro de NexArtPro** (donde ya vive hoy — `signing_packages`,
`signing_participants`, `signing_events`, `signing_certificates`, Edge Functions
`completeSigningPackage`/`resolveSigningPackageToken`/`requestSigningOtp`/etc.), pero mantenerlo
lo bastante modular como para poder:
1. Extraerlo a un proyecto aparte mas adelante si hace falta, o
2. Una vez maduro, conectarlo con los otros proyectos relacionados (el sistema de Work Orders
   externo de arriba, y potencialmente otros).

**Que dejar preparado, sin construir todavia:** no acoplar mas de lo necesario la logica de
NexArtSign a componentes internos de NexArtPro que no sean genericos (nexartClient, RLS por rol).
Cuando se retome el trabajo pendiente de NexArtSign (`docs/nexartsign-security-roadmap.md`,
`OPEN_GAPS.md` items 1-3), tener en mente esta doble posibilidad de salida (extraer o conectar) al
tomar decisiones de diseño, sin que eso bloquee avanzar dentro de NexArtPro por ahora.

**Aclaracion del dueno (2026-07-29):** la implementacion actual de NexArtSign "no funcionaba
bien" tal como estaba disenada — **se autoriza modificar su arquitectura**, no solo aplicar
hardening de seguridad sobre el diseño existente. Esto va mas alla de la regla general de
"extender lo que ya existe" (`docs/agent/EXECUTION_RULES.md`) especificamente para este modulo.
Que es NexArtSign (por si no estaba claro, segun el dueno): un modulo de firma electronica tipo
DocuSign — se cargan "paquetes de firma" (`SigningPackage`) para que una o mas personas firmen un
documento (tipico: un `Estimate`). Descripcion completa en `docs/nexartsign-security-roadmap.md` ("What NexArtSign is") y vision de
producto/UX (flujo de firma, principios, backlog) en `docs/nexartsign-product-context.md`,
destilada 2026-07-29 del intento de proyecto standalone
(`D:\My Bussines\Strategy\NexArtSign\nexartsign-pro-app`).

---

## 13. Como iniciar cada sesion en Claude Code

```
Lee CLAUDE.md completo. Estamos trabajando en [TAREA G — proxima tanda de RLS, batch 2].
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

*Version: 2.6 — 2026-07-30*
*R.C Art Construction LLC — NexArtPro*
