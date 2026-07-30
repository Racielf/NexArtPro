# OPEN_GAPS

## Proposito

Centralizar gaps conocidos para evitar re-diagnostico innecesario.

## Formato

- modulo
- gap real
- impacto
- prioridad
- estado
- evidencia

---

## 1. NexArtSign

### Gap

Migracion completa a lookup por `token_hash` y retiro total del uso residual de token plano.

### Impacto

Integridad legal, seguridad y endurecimiento del acceso publico.

### Prioridad

Critica

### Estado

Resuelto. Verificado directamente en codigo el 2026-07-27: cero lookups por `token` plano en `base44/functions/`, `buildIssuedTokenFields()` nunca persiste el token en texto plano, y el token se revoca (`token_hash`, `token`, `token_last_four` limpiados + `token_revoked_at`) al firmar o declinar. El roadmap decia "parcial" pero estaba desactualizado — el trabajo ya se habia hecho en una sesion anterior no documentada.

Queda un punto sin verificar por separado: ruta de fallback para tokens legacy emitidos antes de este hardening. No confirmado ni descartado. Ver `docs/nexartsign-security-roadmap.md`.

### Evidencia

- `docs/nexartsign-security-roadmap.md`
- `base44/functions/resolveSigningPackageToken/entry.ts` (lineas 34, 44)
- `base44/functions/completeSigningPackage/entry.ts` (lineas ~181, ~188, ~200, ~235-249)
- `base44/functions/_shared/nexartsignSecurity.ts` (`buildIssuedTokenFields`, lineas 35-42)

---

## 2. NexArtSign

### Gap

Minimizacion de la verificacion publica en `/verify-document`.

### Impacto

Exposicion innecesaria de datos de firma si la vista publica muestra mas de lo necesario.

### Prioridad

Alta

### Estado

Pendiente segun roadmap.

### Evidencia

- `docs/nexartsign-security-roadmap.md`

---

## 3. NexArtSign

### Gap

Migracion de paquetes, participantes, eventos y certificados a tablas Supabase con RLS.

### Impacto

Seguridad, aislamiento y consistencia del modelo de firma.

### Prioridad

Alta

### Estado

Pendiente segun roadmap.

### Evidencia

- `docs/nexartsign-security-roadmap.md`

---

## 4. System map

### Gap

Mapa tecnico aun incompleto para entidades y relaciones fuera de las areas ya verificadas.

### Impacto

Mas tiempo de verificacion en cada tarea y mas riesgo de preguntar cosas ya conocidas pero no documentadas.

### Prioridad

Media

### Estado

Abierto

### Evidencia

- `src/App.jsx`
- `src/lib/nexArtSign.js`
- `src/lib/workOrderInvoiceConversion.js`
- `src/brain/modules/securityBrain.js`

---

## 5. Cash flow

### Gap

No esta documentado aqui todavia el mapa completo entre invoice, payments, pagos reales y conciliacion bancaria.

### Impacto

Riesgo de ambiguedad en tareas financieras.

### Prioridad

Alta despues de NexArtSign

### Estado

Pendiente de documentar mejor

### Evidencia

- `src/lib/workOrderInvoiceConversion.js`

---

## 6. Toda la base de datos de produccion — CERRADO 2026-07-30 (salvo NexArtSign publico)

### Gap

`rls_policy_always_true` en 121+ policies a lo largo de casi toda la DB de produccion
(`hdiejuqbhqhebrpneymo`), mas ~30 policies `TO public` adicionales. Acceso publico de
lectura/escritura sin login, usando la anon key publica que ya esta en el bundle del frontend.

### Impacto

Critico. Exposicion activa de datos de negocio a cualquiera con la anon key publica, sin
necesidad de autenticarse.

### Prioridad

Alta — ya no es "critica bloqueante" (eso era gap 7, resuelto). El resto de tablas sigue
pendiente y requiere decision explicita del dueno sobre prioridad/alcance antes de la siguiente
tanda — no es un barrido ciego, es revision tabla por tabla (confirmado necesario: ver Estado).

### Estado

Descubierto 2026-07-27. Bloqueado por gap 7 (autenticacion real) hasta que se resolvio 2026-07-29.

**Batch 1 cerrado y verificado 2026-07-29 (24 tablas)** — Investor Hub (10), CRM central (9),
financieras/infraestructura admin-only (4), profiles (1). Detalle completo en `CLAUDE.md`
seccion 11 TAREA G. Hallazgo critico durante este batch: las policies `users_own_X` en las tablas
de CRM central asumian que cada fila pertenece a un usuario individual (`auth.uid() = user_id`),
pero `estimates` tenia 27 filas reales con **0** `user_id` puesto — confiar en esas policies sin
revisar habria repetido el desastre del Investor Hub en las tablas mas criticas del negocio.
Tambien se confirmo que no todo `TO public` es inseguro: `change_orders`, `wo_communications`,
`wo_documents`, `wo_line_items`, `wo_photos` ya tenian `qual: auth.role() = 'authenticated'`, que
es `false` para anon real — no necesitaron cambio.

**Batches 4 y 5 cerrados y verificados 2026-07-29 (28 tablas mas)** — 20 operativas de detalle
(equipo compartido, admin-only delete) + 8 de logs/auditoria (`admin`/`agent` pueden INSERT su
propia accion, solo `admin` puede SELECT, sin UPDATE/DELETE). `/security-dashboard` y
`/recovery-center` ahora protegidas a nivel de ruta (`access="owner"`) — antes no lo estaban pese
a estar ocultas en el sidebar para no-admin.

**Hallazgo critico adicional (mismo dia):** al verificar el batch 5, se encontro que 34 tablas
tenian ademas una policy `"Allow all for authenticated"` (`roles: {authenticated}`, `qual: true`)
— un TERCER patron que ni la auditoria original ni el batch 1 habian buscado (solo se auditaba
`anon` y `public`). Esto anulaba las restricciones de los batches 2-5 por completo: cualquier
usuario autenticado, sin importar rol, tenia acceso total via esta policy paralela — confirmado
que un agente podia leer `audit_logs` pese a la policy admin-only. Corregido en las 34 tablas
(`20260729h_rls_fix_allow_all_authenticated_bypass.sql`); esto causo una regresion de paso (las 5
tablas de NexArtSign se quedaron sin ningun acceso `authenticated`, restaurado en
`20260729i_rls_restore_nexartsign_internal_access.sql` sin tocar su lado `anon`, que sigue
deferred). Ver `CLAUDE.md` seccion 11 TAREA G para el detalle completo y la metodologia de
auditoria actualizada (ahora son 3 patrones a buscar, no 2).

**Pendiente (fuera de este batch):** solo las tablas publicas de NexArtSign (que se solapan con
los gaps 1-3 de este mismo archivo — coordinar con ese roadmap, no redisenar). Lista completa en
`CLAUDE.md` seccion 11 TAREA G.

**Cierre 2026-07-30:** se verifico en vivo contra `pg_policies` (los 3 patrones de arriba) sobre
las 64 tablas con RLS de `public`. No quedaba ningun "batch 2" real de tablas pendientes — el
conteo de "~35+ tablas" del parrafo anterior estaba mal, la unica exposicion que sigue abierta son
las 5 tablas publicas de NexArtSign ya mencionadas, diferidas a proposito. Gap cerrado.

### Evidencia

- Query directa a `pg_policies` en `hdiejuqbhqhebrpneymo` (2026-07-27 y 2026-07-29)
- Supabase security advisor: 164 warnings, 121 de tipo `rls_policy_always_true`
- `supabase/migrations/20260727_investor_hub_rls_remediation.sql` (intento original)
- `supabase/migrations/20260727b_investor_hub_rls_emergency_revert.sql` (reversion, bloqueado por gap 7)
- `supabase/migrations/20260729b_rls_batch1_investor_hub_reclose.sql` (Investor Hub, cerrado)
- `supabase/migrations/20260729c_rls_batch2_core_crm.sql` (CRM central, redisenado)
- `supabase/migrations/20260729d_rls_batch3_admin_only_infrastructure.sql` (admin-only)
- `supabase/migrations/20260729e_rls_batch3b_profiles_close_anon.sql` (profiles)

---

## 7. Autenticacion — RESUELTO 2026-07-29

### Gap

Esta app no tiene ningun mecanismo de sesion real de Supabase Auth. `grep` en `src/` no encuentra
`signInWithPassword`/`signInWithOtp`/`signInWithOAuth`/`signUp` en ningun lado — solo `signOut()`.
`app_users` no tiene columna `auth_user_id` pese a que `AuthContext.jsx` intenta consultarla. El
unico login que funciona de verdad es `TeamAccess.jsx`: codigo de equipo hardcodeado en el bundle
del frontend + verificacion de usuario/password en texto plano contra `app_users`
(`userStore.js authenticate()`, sin hash), usando la anon key, que solo guarda banderas en
`sessionStorage` — nunca crea un JWT.

### Impacto

Critico y estructural. Como `auth.uid()` es siempre `NULL`, Row Level Security por usuario/rol es
imposible de aplicar en cualquier tabla de esta app hasta resolver esto — verificado en carne
propia con el intento de RLS hardening del Investor Hub (gap 6), que dejo la tabla inaccesible
para todos, admin incluido, y tuvo que revertirse. Ademas `userStore.createUser()` no valida
nada — con `app_users` en `anon_full_access` (estado real hoy), cualquiera con la anon key puede
insertarse una cuenta `role: 'admin'` sin pasar por ningun login.

### Prioridad

Critica — bloquea gap 6 (RLS del resto de la DB) y cualquier intento futuro de hardening real.

### Estado

Descubierto 2026-07-27, implementado 2026-07-28 (ver `CLAUDE.md` seccion 11 TAREA H para el
detalle completo). `app_users.auth_user_id` agregado y vinculado a las 2 cuentas reales de
Supabase Auth que ya existian; `app_users` RLS cerrada (incluyendo policies `TO public` que la
auditoria original no habia contado, ver gap 6); Edge Functions `create-team-account`/
`pin-login`/`set-pin` reemplazan el flujo de registro sin validacion; `TeamAccess.jsx` reescrito
sin codigo de equipo hardcodeado.

Verificado en vivo 2026-07-29 por el dueno: login real funcionando para `racinllerf@gmail.com` y
para una cuenta de agente de prueba (`yaymirc@gmail.com`, creada durante la verificacion),
`auth.users.last_sign_in_at` poblado para ambas (prueba directa de que `auth.uid()` funciona).
`app_users.password` (texto plano) eliminada. Dos bugs reales se encontraron y corrigieron en el
camino — ver `CLAUDE.md` seccion 11 TAREA H para el detalle completo (bug de
`investor_user_role()` comparando la columna equivocada, y race condition del evento
`PASSWORD_RECOVERY`). El flujo final quedo distinto del plan original por feedback del dueno: sin
invitacion por correo (creacion de cuenta instantanea), PIN generado automaticamente (nunca a
mano), y autoservicio de reset de PIN via email para cuando no hay admin disponible.

Cierra este gap. El siguiente paso natural es retomar gap 6 (RLS del resto de la DB) ahora que
`auth.uid()` funciona de verdad.

### Evidencia

- `grep -rn "signInWithPassword\|signInWithOtp\|signInWithOAuth\|auth\.signUp" src/` → 0 resultados
- `src/lib/AuthContext.jsx` (`loadUserProfile`, consulta `auth_user_id`)
- `SELECT auth_user_id FROM app_users` → error 42703, columna no existe (verificado en produccion)
- `src/pages/TeamAccess.jsx`, `src/lib/userStore.js` (`authenticate`, `createUser`)
- `SET ROLE anon; SELECT count(*) FROM projects;` → 0 con policies `TO authenticated`, confirmando
  que ninguna sesion real llega nunca a Postgres
- `src/App.jsx` commit `5304dae` (2026-06-09) — bypass original; corregido 2026-07-27
- `supabase/migrations/20260727_investor_hub_rls_remediation.sql` (la parte ya corregida)

---

## 8. Funciones SECURITY DEFINER expuestas de mas via RPC — RESUELTO 2026-07-30

### Gap

10 funciones `SECURITY DEFINER` eran ejecutables directo por `anon`/`authenticated` via
`/rest/v1/rpc/...`, sin que ningun caller legitimo lo necesitara.

### Impacto

Alto para 3 de las 10: `create_security_block` permitia a cualquiera con la anon key bloquear el
IP/fingerprint de otra persona (griefing/DoS contra el flujo publico de firma de NexArtSign),
`write_security_audit_log` permitia contaminar el log de auditoria con entradas falsas, y
`record_nexartsign_token_attempt` permitia falsificar intentos fallidos de otra persona (pudiendo
disparar un bloqueo real contra una victima). Las otras 6 (`nexartsign_recent_failed_attempts`,
`is_origin_blocked`, `handle_new_user`, `send_invoice_email`, `send_welcome_email`,
`update_company_config_timestamp`) tenian menor riesgo practico.

### Prioridad

Alta

### Estado

Resuelto. Verificado que los unicos callers reales (`supabase/functions/_shared/nexartsignSecurity.ts`)
usan `service_role` via `createSupabaseAdmin()`, que ignora GRANTs de Postgres — revocar el
acceso de `anon`/`authenticated` no rompe ningun flujo real. `investor_user_role()` se dejo
intacta a proposito (la usan las policies de RLS de toda la app). Detalle completo, incluyendo el
bug de la primera migracion (revocar de `anon, authenticated` fue un no-op porque el permiso real
venia del grant implicito a `PUBLIC`), en `CLAUDE.md` seccion 11 TAREA G.

### Evidencia

- Supabase security advisor: `anon_security_definer_function_executable` /
  `authenticated_security_definer_function_executable`
- `supabase/migrations/20260730_revoke_anon_rpc_security_definer_functions.sql`

---

## 9. Advisories menores de Supabase — Abierto, sin decision de prioridad

### Gap

Encontrados en el mismo barrido del gap 8, sin relacion directa con exposicion de datos de
negocio: `function_search_path_mutable` (~20 funciones sin `SET search_path`, riesgo de hijacking
via `search_path` si alguien puede crear objetos en un schema que aparezca antes en el path),
`extension_in_public` (`pg_net` instalada en el schema `public` en vez de uno dedicado),
`public_bucket_allows_listing` (el bucket de storage `documents` tiene una policy SELECT amplia
que permite listar todos los archivos del bucket, no solo acceder por URL directa),
`auth_leaked_password_protection` (Supabase Auth no esta chequeando contrasenas contra
HaveIBeenPwned).

### Impacto

Bajo a medio. Ninguno expone datos de negocio directamente, pero son buenas practicas de
seguridad reales, no ruido.

### Prioridad

Sin definir — requiere decision del dueno sobre si vale la pena dedicar una sesion a esto o
esperar a que se acumule con otro trabajo de seguridad.

### Estado

Abierto

### Evidencia

- Supabase security advisor (`get_advisors`, tipo `security`), 2026-07-30

---

## Regla de mantenimiento

Cuando un gap se cierre:

1. actualizar este archivo
2. enlazar el archivo real que lo confirma
3. moverlo de pendiente a resuelto o parcial