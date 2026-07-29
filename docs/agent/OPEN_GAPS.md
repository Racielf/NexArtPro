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

## 6. Toda la base de datos de produccion — Batch 1 resuelto 2026-07-29, resto pendiente

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

**Pendiente (fuera de este batch):** logs/auditoria, tablas operativas de detalle (fotos, notas,
historiales), y las tablas publicas de NexArtSign (que se solapan con los gaps 1-3 de este mismo
archivo — coordinar con ese roadmap, no redisenar). Lista completa en `CLAUDE.md` seccion 11
TAREA G.

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

## Regla de mantenimiento

Cuando un gap se cierre:

1. actualizar este archivo
2. enlazar el archivo real que lo confirma
3. moverlo de pendiente a resuelto o parcial