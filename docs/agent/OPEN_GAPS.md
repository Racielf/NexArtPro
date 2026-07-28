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

## 6. Toda la base de datos de produccion

### Gap

`rls_policy_always_true` en 121 policies a lo largo de casi toda la DB de produccion
(`hdiejuqbhqhebrpneymo`), incluyendo `app_users`, `bank_accounts`, `bank_transactions`,
`invoices`, `clients`, `subscriptions`, `recovery_vault`, `security_audit_logs`,
`payroll_entries`, `payroll_runs`, `work_orders`, `estimates`, `leads`. Muchas tienen una policy
literal `anon_full_access` (`roles: {anon}`, `cmd: ALL`, `USING (true)`) — acceso publico de
lectura/escritura sin login, usando la anon key publica que ya esta en el bundle del frontend.

### Impacto

Critico. Exposicion activa de datos financieros, de nomina, bancarios y de cuentas de usuario a
cualquiera con la anon key publica, ahora mismo, sin necesidad de autenticarse.

### Prioridad

Critica — mayor que NexArtSign. Requiere decision explicita del dueno del proyecto sobre
prioridad/alcance antes de tocar nada, porque algunas tablas (`signing_packages`,
`signing_participants`, `signing_events`, `company_config`) legitimamente necesitan algo de acceso
anonimo para el flujo publico de NexArtSign/estimates — no es un barrido ciego, es revision tabla
por tabla.

### Estado

Descubierto 2026-07-27 al verificar la correccion de RLS del Investor Hub (ver `CLAUDE.md`
seccion 10 fase 7 y seccion 11 TAREA G). Investor Hub (10 tablas) ya remediado y verificado. El
resto de la DB (~111 policies mas) sigue sin tocar.

### Evidencia

- Query directa a `pg_policies` en `hdiejuqbhqhebrpneymo` (2026-07-27)
- Supabase security advisor: 164 warnings, 121 de tipo `rls_policy_always_true`
- `supabase/migrations/20260727_investor_hub_rls_remediation.sql` (la parte ya corregida)

---

## Regla de mantenimiento

Cuando un gap se cierre:

1. actualizar este archivo
2. enlazar el archivo real que lo confirma
3. moverlo de pendiente a resuelto o parcial