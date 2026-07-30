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

**Punto pendiente cerrado 2026-07-30:** se consulto directo la produccion — de 10 `signing_packages`
y 11 `signing_participants` en total, **cero** filas tienen un `token` en texto plano (todas
`NULL`/vacio). No hay ningun token legacy pre-hardening dando vueltas; el punto de fallback quedaba
sin uso real, no hace falta ninguna ruta especial para el.

### Evidencia

- `docs/nexartsign-security-roadmap.md`
- `base44/functions/resolveSigningPackageToken/entry.ts` (lineas 34, 44)
- `base44/functions/completeSigningPackage/entry.ts` (lineas ~181, ~188, ~200, ~235-249)
- `base44/functions/_shared/nexartsignSecurity.ts` (`buildIssuedTokenFields`, lineas 35-42)
- Query directa a `signing_packages`/`signing_participants` en `hdiejuqbhqhebrpneymo`, 2026-07-30

---

## 2. NexArtSign — RESUELTO 2026-07-30

### Gap

Minimizacion de la verificacion publica en `/verify-document`.

### Impacto

Exposicion innecesaria de datos de firma si la vista publica muestra mas de lo necesario. Real,
no hipotetico: el Edge Function publico `resolveSigningCertificate` devolvia nombre y email del
firmante, su IP, el audit trail completo, y URLs directas al PDF firmado/fuente — con solo un
numero de certificado, sin login.

### Prioridad

Alta

### Estado

Resuelto (Fase 6 del roadmap de NexArtSign). El frontend (`VerifyDocument.jsx`) ya proyectaba solo
un subconjunto minimo, pero eso no protegia nada — la respuesta cruda del Edge Function traia todo.
Se recorto el payload de `supabase/functions/resolveSigningCertificate/index.ts` al checklist
exacto de la Fase 6 (numero de certificado, estado, fecha de firma, resultado de verificacion de
hash, proveedor) y se redeploy (version 9). Detalle completo en
`docs/nexartsign-security-roadmap.md` Fase 6.

### Evidencia

- `docs/nexartsign-security-roadmap.md` Fase 6
- `supabase/functions/resolveSigningCertificate/index.ts`

---

## 3. NexArtSign — RESUELTO 2026-07-30

### Gap

Migracion de paquetes, participantes, eventos y certificados a tablas Supabase con RLS.

### Impacto

Seguridad, aislamiento y consistencia del modelo de firma.

### Prioridad

Alta

### Estado

Resuelto. Se verifico directo en codigo (no solo en la DB): cero referencias a `base44` en
`src/pages/NexArtSign.jsx` (panel admin), `src/pages/SignDocumentView.jsx` (vista publica de
firma), ni `src/lib/nexArtSign.js`. `nexartClient.js` mapea `SigningPackage`/`SigningParticipant`/
`SigningEvent`/`SigningCertificate` a tablas Supabase reales, y las 5 funciones que invoca el flujo
publico de firma (`resolveSigningPackageToken`, `requestSigningOtp`, `verifySigningOtp`,
`sendSignedCopy`, `completeSigningPackage`) estan desplegadas de verdad en Supabase (cruzado contra
`list_edge_functions`). Fase 7 del roadmap actualizada a completa.

### Evidencia

- `docs/nexartsign-security-roadmap.md` Fase 7
- `src/pages/NexArtSign.jsx`, `src/pages/SignDocumentView.jsx`, `src/lib/nexArtSign.js` — cero
  referencias a `base44`
- `src/api/nexartClient.js` (mapeo de entidades de firma a tablas Supabase)

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

## 10. Migracion Base44 -> Supabase incompleta — 2 de 7 funciones rotas siguen pendientes

### Gap

La migracion de `base44/functions/` a `supabase/functions/` quedo a medias. `nexartClient.js`
rutea toda llamada a `functions.invoke(...)` directo a Supabase, sin fallback a Base44 — asi que
las funciones nunca portadas fallan en produccion hoy, no es solo deuda tecnica cosmetica.

### Impacto

Bajo ya (era Alto). Solo quedan rotas: `submitContactForm` (formulario de contacto publico, 3
call sites) y `agentTestRunner` (panel interno de Settings). `resolveAttachmentPublicUrl` sigue
bloqueada por una decision de diseño de datos (ver nota), no por falta de tiempo.
`resolveEstimatePublicToken`, `lowMarginAlert`, `approveMargin` resueltos 2026-07-30.
`sendSignedEstimateCopy` cerrado el mismo dia — era codigo muerto, se borro.

### Prioridad

Media — lo que tocaba cash flow directamente (el link publico del estimate) ya esta resuelto. Lo
que queda es menor: un formulario de contacto y una herramienta interna de testing.

### Estado

Documentado y con plan por etapas 2026-07-30, tras pedido del dueno de formalizar la estrategia de
sacar Base44 del sistema. Plan completo, inventario, y tabla de las 7 funciones en
`docs/agent/BASE44_REMOVAL_PLAN.md`. Se resolvio de paso la credencial de Base44 hardcodeada en
`base44/.app.jsonc` (commiteada desde el primer commit).

**`resolveEstimatePublicToken` cerrada el mismo dia.** Causa raiz real: no era solo la funcion —
`estimates.public_share_token`/`public_share_token_created_at` no existian en produccion pese a
que el frontend activo (`estimateSalesLifecycle.js`) ya las necesitaba para generar el link que se
manda al cliente. Se agregaron esas 2 columnas (migracion aditiva) y se desplego la funcion nueva
contra el schema real. Verificado end-to-end con un estimate real.

**`lowMarginAlert` y `approveMargin` cerradas el mismo dia, rediseñadas en vez de portadas tal
cual.** `approveMargin` tenia un fallo real en el original de Base44 (PIN de admin hardcodeado
`'1234'` como fallback si la variable de entorno no estaba configurada) — se reescribio para
reusar el sistema de PIN por admin de TAREA H (`app_users.pin_hash`) en vez de un secreto
compartido. `lowMarginAlert` dependia de Firebase/Twilio, ninguno configurado — se reemplazo por
el patron de notificacion por email que ya usa el resto de la app (`businessNotifications.js`).
Ningun cambio de contrato hacia el frontend en ninguno de los dos casos.

**`sendSignedEstimateCopy` cerrada el mismo dia — era codigo muerto.** Todo
`src/lib/nexArtSignCompletion.js` (el archivo que la llamaba) no tenia ningun importador real en
todo el repo — se borro. El flujo real de completion de firma pasa por
`SignDocumentView.jsx` -> `completeSigningPackage`/`sendSignedCopy` (ya migrados).

Solo quedan sin tocar: `submitContactForm`, `agentTestRunner`. Detalle completo de todo en
`docs/agent/BASE44_REMOVAL_PLAN.md`. Requiere decision del dueno sobre si seguir con esas 2, o la
sesion dedicada de rediseño de Estimates (gap 11) si aplica.

### Evidencia

- `docs/agent/BASE44_REMOVAL_PLAN.md`
- `src/api/nexartClient.js` lineas 381-417 (`functionsProxy`, sin fallback a Base44)
- `mcp__claude_ai_Supabase__list_edge_functions` sobre `hdiejuqbhqhebrpneymo`, cruzado contra
  `grep functions.invoke( src/`
- `supabase/migrations/20260730_estimates_add_public_share_token.sql`
- `supabase/functions/resolveEstimatePublicToken/index.ts`

---

## 11. Rediseño completo de Estimates — diferido a proposito, contexto capturado

### Gap

El dueno confirmo 2026-07-30 que quiere rediseñar el modulo de Estimates de punta a punta (armado
del documento, plantillas, adjuntos, integracion con NexArtSign, modelo de archivado/restauracion)
en una sesion dedicada, en vez de seguir parchando. No es un gap tecnico puntual — es una decision
de producto/arquitectura pendiente de planear.

### Impacto

Alto. Estimates es el primer paso de la cadena hacia el cobro (prioridad #2 en
`OPERATING_PRIORITIES.md`) y alimenta Invoices, Work Orders y NexArtSign.

### Prioridad

A definir por el dueno cuando quiera agendar esa sesion — no es urgente en el sentido de "algo
roto ahora mismo" (lo que estaba activamente roto, `resolveEstimatePublicToken`, ya se arreglo por
separado en gap 10), pero el resto del modulo (adjuntos, integracion de firma, plantillas) sigue
con huecos reales de datos.

### Estado

Contexto capturado, sin plan todavia — a proposito, para no arrancar sin alinear alcance primero.
Ver `docs/estimates-redesign-context.md` para el detalle completo: por que el dueno quiere
rediseñarlo, la evidencia tecnica que respalda esa frustracion (schema real vs. lo que el codigo
asume, migraciones aplicadas a produccion sin quedar versionadas en el repo), y las preguntas
abiertas para cuando se retome.

### Evidencia

- `docs/estimates-redesign-context.md`
- `docs/agent/BASE44_REMOVAL_PLAN.md` (causa raiz tecnica de `resolveEstimatePublicToken`)

---

## 12. "Cerebro" de seguridad (src/brain + privilegedActionGuard) — investigado, sin bug confirmado, requiere mas detalle del dueno

### Gap

El dueno describio (2026-07-30, en el contexto del rediseño de Estimates) que en algun momento
creo un "cerebro" autonomo para vigilar calculos y el sistema en general, que esto se termino
mezclando con seguridad y borrado de archivos, y que "dos o tres cosas de seguridad no funcionan
bien" como resultado. Se investigo el codigo real para documentar el estado, no para arreglarlo
todavia.

### Que es esto tecnicamente

- `src/brain/modules/securityBrain.js` — modulo de solo lectura: analiza `auth_security_logs` y
  `audit_logs` (ultimas 24h/7d) y produce "checks" de salud (eventos criticos, intentos fallidos
  repetidos, actividad de purge/restore) para el Security Dashboard.
- `src/lib/privilegedActionGuard.js` — la pieza real de "seguridad mezclada con borrado de
  archivos": gatea las acciones `RESTORE_RECORD` y `PURGE_RECORD` del Recovery Center
  (`src/pages/RecoveryCenter.jsx`). Antes de dejar restaurar o purgar (borrado permanente) un
  registro, llama a `securityBrain` como "advisory". Si `securityBrain` devuelve nivel `critical`
  y la accion es `PURGE_RECORD`, la bloquea automaticamente (`auto_block_on_critical_brain`) con
  un `window.alert`. Para `RESTORE_RECORD` o nivel `warning`, muestra un `window.confirm` y deja
  seguir si el usuario acepta.
- `src/brain/core/actionGuards.js` — funcion generica de gate (`allowed`/`blocked`/
  `requiresConfirmation`) que usan varios modulos de brain, no solo seguridad.

### Verificado hoy (solido, no roto)

- Las columnas que `securityBrain.js` lee (`event_type`, `success`, `user_identifier`,
  `created_date` en `auth_security_logs`; `action`, `performed_at`, `created_date` en
  `audit_logs`) existen de verdad en las tablas reales de produccion — no hay mismatch de schema
  como el que se encontro en `estimates` (ver gap 10/11).
- Los IDs de accion coinciden entre `RecoveryCenter.jsx` (`'RESTORE_RECORD'`, `'PURGE_RECORD'`) y
  `PRIVILEGED_ACTIONS` en `privilegedActionGuard.js` — no hay bug de nombre desalineado ahi.
- No se encontro ningun error de ejecucion evidente (imports rotos, funciones inexistentes) en el
  camino RecoveryCenter -> privilegedActionGuard -> securityBrain.

### Debilidades reales, ya auto-documentadas por el propio sistema (no son un bug nuevo, son
### tradeoffs aceptados en su momento)

`src/docs/PRIVILEGED_ACTION_GUARD.md` (seccion "Current Limitations") ya admite: no hay
reautenticacion con password, no hay OTP/2FA (nunca se conecto un proveedor SMS como Twilio), la
sesion privilegiada vive solo en `sessionStorage` (se pierde al cerrar el navegador, no sincroniza
entre pestañas), y el contador de intentos fallidos se resetea con un refresh de pagina. Ademas,
usar `window.confirm`/`window.alert` para una decision de seguridad critica (bloquear un purge) es
un patron fragil — no es una barrera real, es una confirmacion de UI.

### Lo que no se pudo confirmar

No se encontro un bug reproducible (crash, error visible, accion que deberia bloquear y no
bloquea) con la investigacion de hoy. Es posible que lo que el dueno recuerda como "no funciona
bien" haya sido el bug real de RLS encontrado y corregido en la misma sesion de hoy (TAREA G batch
5, `CLAUDE.md` seccion 11): antes de esa correccion, cualquier usuario `authenticated` — no solo
`admin` — podia leer `audit_logs`/`security_audit_logs`/`auth_security_logs` via una policy
paralela (`"Allow all for authenticated"`), lo que habria hecho que el "advisory" de seguridad no
protegiera nada de verdad para nadie con sesion. Esa policy paralela ya esta cerrada.

### Prioridad

Sin definir — requiere que el dueno aporte un caso concreto (que paso, en que pantalla, mensaje de
error si hubo) para poder reproducir y arreglar algo especifico, en vez de rediseñar a ciegas.

### Estado

Investigado y documentado 2026-07-30. Sin bug confirmado todavia — pendiente de mas detalle del
dueno o de una prueba en vivo guiada.

### Evidencia

- `src/brain/modules/securityBrain.js`
- `src/lib/privilegedActionGuard.js`
- `src/pages/RecoveryCenter.jsx` lineas 182, 192, 212, 243, 260
- `src/docs/PRIVILEGED_ACTION_GUARD.md` (seccion "Current Limitations")
- Columnas reales de `audit_logs`/`auth_security_logs` verificadas via `information_schema.columns`
- `CLAUDE.md` seccion 11 TAREA G (hallazgo de la policy `"Allow all for authenticated"`)

---

## 13. Marco legal de firma electronica (NexArtSign) — FASE ABIERTA, se seguiran redactando mas politicas

### Gap

El dueno pidio investigar el sustento legal real de las firmas digitales (ley federal ESIGN Act +
ley de Oregon UETA) contra fuentes oficiales, comparar contra el estandar de industria (DocuSign,
Adobe Sign), y evaluar si NexArtSign aguantaria un escenario de demanda — documentar esto si no
existia. No existia ningun documento asi antes de hoy.

### Impacto

Alto — es literalmente la pregunta de si el modulo de firma (que ya se usa para convertir estimates
en contratos vinculantes) se sostiene legalmente si alguna vez se disputa en corte.

### Prioridad

Alta, ligada a NexArtSign (prioridad #1 del proyecto).

### Estado

Investigado y documentado 2026-07-30 en `docs/SignLaw.md` (escrito para ser portable — el dueno lo
va a reusar en otras apps que esta desarrollando).

**v2 (mismo dia):** el dueno señalo que ya tenia una politica mas rigurosa construida para otra app
propia (`SingLw-V1` / `legal-evidence-policy.md`, ArtFocusSing) y pidio adaptarla, no solo
copiarla. Se fusiono: limite explicito de terminologia legal (que palabras no usar sin aprobacion
de abogado), 10 pilares de exigibilidad (mas rigurosos que el checklist de 12 puntos de v1), un
modelo de evidencia con **cadena de hashes encadenados entre eventos** (no un hash suelto del PDF
final), matriz de disputas, y un modelo de gobernanza (roles + gates de aprobacion). Se agregaron
fuentes nuevas: UETA de California, Federal Rules of Evidence 803/901/902/1001-1003, reporte de la
FTC, NIST SP 800-63, advisory de la CPPA, y Dropbox Sign como tercer proveedor de referencia.

**Resultado del gap analysis (actualizado contra los 10 pilares nuevos):** NexArtSign cumple solido
6 de 10, parcial en 3, no implementado en 1 (no existe clasificador de elegibilidad de documento).
**Hallazgo nuevo en v2 que v1 no habia detectado:** el gap de integridad no es (solo) "falta firma
digital embebida tipo PAdES" — es mas preciso y mas barato de resolver: **falta encadenar
`signing_events` entre si con hash** (`previous_evidence_hash`), no solo hashear el PDF final. Esa
es ahora la recomendacion #1 en `docs/SignLaw.md` seccion 10 (mas barata que adoptar PAdES/PKI
completo).

**Divergencia marcada explicitamente, no oculta:** ArtFocusSing (la otra app del dueno) parte de
no-recolectar IP/user-agent por defecto hasta aprobacion formal de privacidad; NexArtSign ya
recolecta `ip_address`/`user_agent`/`device_fingerprint` en produccion. **Aviso agregado el mismo
dia (2026-07-30):** el dueno confirmo que la recoleccion debe seguir — investigado que la IP **si
es informacion personal** bajo CCPA/CPRA y la nueva Oregon Consumer Privacy Act (vigente desde
2024-07-01), sobre todo guardada junto a otro identificador (como ya hace NexArtSign). La ley exige
aviso, no consentimiento opt-in (la IP no es "dato sensible" en estas leyes). Se agrego el aviso
explicito directamente al texto de consentimiento del firmante
(`src/pages/SignDocumentView.jsx`, paso "Legal consent") — ahora dice explicitamente que se
recolecta IP/navegador-dispositivo/timestamp, con que proposito, y que se retiene como parte del
registro legal. Sigue pendiente la revision de privacidad formal por escrito (gobernanza interna,
seccion 8 de `docs/SignLaw.md`) — el aviso al firmante ya existe, el proceso interno no.

**No ejecutado hoy a proposito (salvo el aviso de IP/UA, ver arriba)** — el pedido general fue
investigar y documentar, no implementar todo. Las 5 recomendaciones restantes (encadenar eventos
con hash, pantalla de disclosure completa, evaluar PAdES, politica de
retencion, clasificador de elegibilidad) quedan en `docs/SignLaw.md` seccion 10, priorizadas por
costo/impacto, pendientes de decision del dueno.

**Fase declarada abierta a proposito (2026-07-30) — no cerrar este gap.** El dueno confirmo que van
a seguir redactando mas politicas legales sobre NexArtSign en sesiones futuras (no es un
entregable de una sola vez). `docs/SignLaw.md` va a seguir recibiendo versiones nuevas (v3, v4...)
a medida que se agreguen mas politicas — tratar este gap como vivo/recurrente, no como algo para
marcar "resuelto" cuando se cierre una recomendacion puntual de la seccion 10. Actualizar este gap
en cada sesion futura que toque `docs/SignLaw.md`, no crear un gap nuevo cada vez.

### Evidencia

- `docs/SignLaw.md`
- `src/pages/SignDocumentView.jsx` (paso de consentimiento, lineas ~641, ~839-848)
- `supabase/functions/completeSigningPackage/index.ts` (`sha256HexFromBytes`, sin cadena de hashes
  entre eventos)
- `D:\My Bussines\SQL BSE\ArtFouS app\dj-artfocus-prod\skills\singlw-v1\references\legal-evidence-policy.md`
  (politica del dueno para ArtFocusSing, fusionada en v2)
- Fuentes oficiales citadas en `docs/SignLaw.md` (govinfo.gov, Cornell LII, oregonlegislature.gov,
  oregon.public.law, leginfo.legislature.ca.gov, uscourts.gov, ftc.gov, nist.gov, cppa.ca.gov,
  docusign.com, adobe.com, dropbox.com)

---

## 14. Vision SaaS multi-tenant + integraciones configurables + import de datos propios — capturada, sin plan

### Gap

No es un gap tecnico — es una vision de producto que el dueno pidio documentar para no perderla
(2026-07-30), surgida al decidir dejar Twilio como integracion opcional por empresa en vez de
conectarla ahora. La idea: vender NexArtPro por suscripcion a otras empresas de contratistas, con
integraciones configurables por empresa (Twilio es solo el primer ejemplo), y que una empresa nueva
pueda traer su propia base de datos (contactos, documentos, precios, clientes) al darse de alta —
via conexion a su propia base o importando CSV/Excel/otros formatos, como hace QuickBooks.

### Impacto

Alto a largo plazo (modelo de negocio), ninguno hoy — nada de esto se ejecuta todavia.

### Prioridad

Sin definir — vision capturada para el futuro, no una tarea en cola.

### Estado

Documentado 2026-07-30 en `docs/saas-multitenant-vision.md`. Se reviso `src/docs/
MULTI_TENANT_MIGRATION_PLAN.md` (2026-04-07) — un plan previo mas acotado (solo agregar
`company_id` a 4 entidades) y tecnicamente desactualizado (escrito contra `base44.entities`, era
pre-Supabase). La base tecnica de ese plan viejo (columna `company_id`) ya esta parcialmente en
produccion hoy (regla 4 de `CLAUDE.md`, un solo valor `'rc-art'` en uso) — la vision nueva es un
salto de alcance mucho mayor, no una continuacion directa de ese plan viejo. Nada planeado en
detalle todavia a proposito — requiere su propia sesion de Plan mode cuando el dueno decida
retomarlo.

**Anotado el mismo dia en `docs/SignLaw.md` seccion 8:** si esto se ejecuta, NexArtSign deja de ser
"la misma entidad que emite documentos" (R.C Art Construction) y pasa a ser un facilitador tecnico
para empresas-tenant terceras — hace falta un deslinde de responsabilidad de la plataforma en los
Terminos de Servicio (la disputa sobre el contenido del documento es entre la empresa-tenant y su
cliente, no contra NexArtSign). No implementado, solo anotado para cuando se retome esta vision.

### Evidencia

- `docs/saas-multitenant-vision.md`
- `src/docs/MULTI_TENANT_MIGRATION_PLAN.md` (prior art, desactualizado)
- `CLAUDE.md` seccion 4 (regla de `company_id: 'rc-art'`)
- `docs/SignLaw.md` seccion 8 (deslinde de responsabilidad de plataforma)

---

## Regla de mantenimiento

Cuando un gap se cierre:

1. actualizar este archivo
2. enlazar el archivo real que lo confirma
3. moverlo de pendiente a resuelto o parcial