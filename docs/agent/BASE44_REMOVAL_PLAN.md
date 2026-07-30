# BASE44_REMOVAL_PLAN

## Proposito

El dueno pidio (2026-07-30) formalizar la estrategia de sacar "Base44" del sistema por completo,
retomando una conversacion previa que no habia quedado documentada. Este archivo es esa
documentacion — inventario real de donde vive Base44 hoy y plan por etapas para eliminarlo, sin
romper nada en el camino.

**Contexto del dueno:** empezo el primer prototipo en la plataforma Base44, no le gusto depender
de ellos, intento volver mas adelante pero Base44 tiene un sistema obligatorio que no le convino, y
se salio. Hoy todo corre en GitHub + Vercel + Supabase. La cuenta de Base44 sigue existiendo pero
no se usa para desarrollo activo.

## Hallazgo critico encontrado al armar este inventario (2026-07-30)

Esto no es solo un tema de branding. La migracion de Base44 a Supabase Edge Functions quedo
**incompleta**, y eso significa que hay llamadas reales del frontend en produccion que fallan hoy:

`src/api/nexartClient.js` (`functionsProxy`, linea 381-417) rutea **toda** llamada a
`nexartClient.functions.invoke(nombre, params)` directo a `supabase.functions.invoke(nombre)` — no
hay ningun fallback a Base44. Verificado con `grep` de todos los `functions.invoke(...)` en `src/`
y cruzado contra la lista real de Edge Functions desplegadas en produccion
(`hdiejuqbhqhebrpneymo`, via `list_edge_functions`):

| Funcion invocada desde el frontend | Desplegada en Supabase | Donde se llama |
|---|---|---|
| `submitContactForm` | **NO** | `src/pages/Contact.jsx:32`, `src/pages/PublicHome.jsx:91,116` — formulario de contacto publico del sitio |
| `resolveEstimatePublicToken` | **SI — resuelto 2026-07-30** | `src/pages/ClientEstimateView.jsx:38` — vista publica del estimate que ve el cliente |
| `resolveAttachmentPublicUrl` | **NO** — bloqueado, ver nota | `src/components/estimates/ClientAttachmentsSection.jsx:32` — adjuntos del estimate |
| `lowMarginAlert` | **Resuelto 2026-07-30 (rediseñado, no portado tal cual)** | `src/pages/EstimateEditor.jsx` |
| `approveMargin` | **Resuelto 2026-07-30 (rediseñado, no portado tal cual)** | `src/components/estimates/internal/PricingOverrideModal.jsx:67` |
| `agentTestRunner` | **NO** | `src/components/settings/AgentTestRunnerPanel.jsx:21` |
| `sendSignedEstimateCopy` | **Cerrado 2026-07-30 — era codigo muerto, se borro** | (era `src/lib/nexArtSignCompletion.js:141`, archivo eliminado) |

### `resolveEstimatePublicToken` — resuelto 2026-07-30

Al portar esta encontramos la causa raiz real: la tabla `estimates` en produccion **no tenia**
`public_share_token`/`public_share_token_created_at`, pese a que el codigo activo del frontend
(`src/lib/estimateSalesLifecycle.js` `generatePublicShareToken()`, usado por
`SendEstimateModal.jsx` para armar el link que se le manda al cliente) ya intentaba escribir esas
columnas desde antes. `supabase/migrations/001_core_tables.sql` las declara, pero **ese archivo
nunca se aplico a produccion** — confirmado contra el historial real de migraciones de Supabase
(`list_migrations`), que no tiene ninguna entrada correspondiente. Osea: el link para que el
cliente vea/apruebe su estimate **no se podia ni generar**, mas alla de que la funcion de
resolucion tampoco existiera.

Arreglo aplicado (acotado, solo lo necesario para desbloquear esto, sin tocar el resto del
modulo — el dueno confirmo que el rediseño completo de Estimates va aparte, ver seccion mas
abajo):
- `supabase/migrations/20260730_estimates_add_public_share_token.sql` — agrega las 2 columnas
  faltantes (nullable, aditivo, no rompe nada existente).
- `supabase/functions/resolveEstimatePublicToken/index.ts` — reescrito contra el schema real de
  `estimates` (no el de Base44). Devuelve un subconjunto seguro para el cliente (excluye
  `*_cost`, `margin_*`, `gross_margin*`, `net_profit*`, `total_book_value`, `total_variance`,
  `internal_notes`, `assigned_to`, `sales_stage`, `approval_note` — datos internos de costo/margen
  que el cliente nunca deberia ver).
- Verificado end-to-end contra un estimate real en produccion (token de prueba temporal, limpiado
  despues de verificar) — path de exito y path 404 confirmados.

**Nota sobre el resto de campos que el Base44 original esperaba y siguen sin existir**
(`attachments`, `document_config`, `signing_package_token`/`status`, `final_signed_pdf_url`,
`signature_brand_logo_url`, etc.): no se agregaron. La funcion nueva simplemente no los devuelve —
el frontend (`ClientEstimateView.jsx`) ya los trata como opcionales (`estimate?.campo`), asi que no
rompe nada, pero significa que **hoy el cliente puede ver y aprobar el estimate, sin adjuntos y sin
integracion con el paquete de firma de NexArtSign visible desde esa pantalla**. Eso coincide con lo
que el dueno describio (adjuntos y firma nunca funcionaron bien del todo) y queda deliberadamente
fuera de este arreglo puntual — es tema del rediseño de Estimates, no de este parche.

### `resolveAttachmentPublicUrl` — sigue bloqueada, no confundir con lo de arriba

No se toco. La tabla `estimates` no tiene columna `attachments` en absoluto (ni JSONB ni tabla
aparte encontrada) — no hay datos que esta funcion pueda resolver todavia. Portarla requeriria
antes decidir donde y como se van a guardar los adjuntos del estimate, lo cual es una decision de
diseño real, no un port mecanico. Queda para cuando se aborde el rediseño de Estimates.

Confirmado que `Contact.jsx` tiene try/catch que muestra el error al usuario (`"An error occurred.
Please try again."`) — no falla en silencio. Cualquiera que llene el formulario de contacto
publico del sitio hoy deberia estar viendo ese error.

### `sendSignedEstimateCopy` — cerrado 2026-07-30, era codigo muerto

Se investigo: `grep` de `nexArtSignCompletion` en todo el repo (no solo `src/`) solo encontraba
este mismo doc — **cero importadores reales**. Todo `src/lib/nexArtSignCompletion.js` estaba
huerfano (incluia ademas `finalizeSignedEstimateFromPackage`, `finalizeDeclinedEstimateFromPackage`,
`finalizeGenericSignedDocumentFromPackage`, tambien sin usar). El flujo de firma activo real pasa
por `SignDocumentView.jsx` llamando directo a los Edge Functions ya migrados
(`completeSigningPackage`, `sendSignedCopy`) — este archivo era un segundo intento de completion
mas viejo, superado y nunca desconectado del repo. Confirmacion adicional de que era codigo muerto
y no solo no-portado: `finalizeDeclinedEstimateFromPackage` escribia
`signature_status`/`signing_package_id` sobre `estimates`, columnas que **no existen** en la tabla
real (mismo problema de raiz que `resolveEstimatePublicToken` — ver esa seccion) — si alguna vez
se hubiera ejecutado, habria fallado igual. Se borro el archivo completo
(`git rm src/lib/nexArtSignCompletion.js`). No hace falta portar nada — no era una funcion real.

### `lowMarginAlert` — resuelto 2026-07-30 (rediseñado, no portado tal cual)

El original de Base44 mandaba una notificacion push via Firebase Cloud Messaging + SMS opcional
via Twilio. Ninguno de los dos esta configurado en esta app — `src/docs/PRIVILEGED_ACTION_GUARD.md`
ya documentaba "No OTP/2FA — Twilio not present" desde antes. En vez de resucitar integraciones
nunca conectadas, se reemplazo con el patron que ya usa el resto de la app para notificar al admin
de eventos de un estimate: `src/lib/businessNotifications.js` (mismo estilo que
`notifyEstimateViewed`/`notifyEstimateApproved`, que ya mandan email via el Edge Function `sendEmail`
ya desplegado). Nueva funcion `notifyLowMargin()` ahi, mas el anti-spam (1 alerta cada 30 min por
estimate) reimplementado client-side contra `estimate_version_histories` (`action:
'low_margin_alert'`) en `src/pages/EstimateEditor.jsx` — mismos nombres de columna reales
verificados contra el schema (`action`, `actor`, `changes`, `changes_note`, no los que asumia el
original de Base44). No se creo ningun Edge Function nuevo — no hacia falta.

### `approveMargin` — resuelto 2026-07-30 (rediseñado, no portado tal cual — hallazgo de seguridad evitado)

**El original de Base44 tenia un fallo real:** `const ADMIN_PIN = Deno.env.get('ADMIN_APPROVAL_PIN')
|| '1234'` — si esa variable de entorno nunca se configuraba, cualquiera podia aprobar un override
de margen con el PIN `1234`. Nunca se desplego a Supabase, asi que nunca se explotó en produccion,
pero portarlo tal cual habria reintroducido el fallo. En vez de eso, se reescribio usando el
sistema de PIN por admin que ya existe desde TAREA H (`app_users.pin_hash`, con
`pin_failed_attempts`/`pin_locked_until`) — cada admin verifica su propio PIN, sin secreto
compartido, mismo patron de rate-limit que `pin-login` (5 intentos, bloqueo 15 min). Nuevo
`supabase/functions/approveMargin/index.ts`, reusando `_shared/authAdmin.ts`
(`requireAdminCaller`) y `_shared/pinHash.ts` (`verifyPin`) ya existentes. Desplegado y verificado
(rechaza correctamente sin sesion, `401 UNAUTHORIZED_NO_AUTH_HEADER`). El contrato de
request/response hacia `PricingOverrideModal.jsx` no cambio — `{pin, estimate_id,
estimate_number, margin_pct}` -> `{approved: true}` / `{error}`, cero cambios de frontend
necesarios.

**Nota operativa:** hoy **ningun admin tiene un PIN configurado** (`SELECT count(*) FROM app_users
WHERE role='admin' AND pin_hash IS NOT NULL` = 0) — el override de margen va a mostrar "No PIN set
for this account" hasta que el dueno configure su PIN en Settings (mismo flujo de `set-pin` de
TAREA H). Es el comportamiento correcto (falla cerrado), no un bug.

Funciones que SI se migraron correctamente y funcionan hoy (para referencia, no tocar):
`sendEstimateEmail`, `sendEmail`, `issueSigningAccessLink`, `resolveSigningPackageToken`,
`requestSigningOtp`, `verifySigningOtp`, `sendSignedCopy`, `completeSigningPackage`,
`resolveSigningCertificate`, `createStripeCheckoutSession`, `resolveEstimatePublicToken`,
`approveMargin`.

## Inventario completo de Base44 en el repo

### 1. Credencial expuesta — RESUELTO 2026-07-30

`base44/.app.jsonc` tenia un `api_key` de Base44 hardcodeado y commiteado a git desde el primer
commit (`a6eeaa8`). Se quito el valor del archivo (ahora lee `process.env.BASE44_API_KEY`), pero
**el valor viejo sigue en el historial de git para siempre** — si la cuenta de Base44 sigue
accesible con esa key, hay que rotarla/revocarla desde el dashboard de Base44. Eso no lo puede
hacer el agente, solo el dueno de la cuenta.

### 2. `base44/` — carpeta de la plataforma legacy (24 funciones, 29 entidades)

- `base44/functions/*/entry.ts` (24 funciones) — implementacion original en la plataforma Base44.
  Confirmado que **nada en el frontend las llama directamente** — el frontend solo conoce
  `supabase.functions.invoke(...)`. Son la unica referencia que queda de las 7 funciones nunca
  portadas (tabla de arriba) — **no borrar hasta portar esas 7**, son el codigo fuente real de esa
  logica de negocio (ej. que campos espera el formulario de contacto, que hace el calculo de
  margen bajo).
- `base44/entities/*.jsonc` (29 definiciones) — schema de entidades de la plataforma Base44. Ya
  reemplazado por las tablas reales de Supabase para casi todo (`nexartClient.entities.*`
  apunta a Supabase, no a esto). Util solo como referencia historica de schema si hace falta
  comparar campos.
- `base44/config.jsonc`, `base44/.app.jsonc` — config de la plataforma Base44, no leidos por el
  build de esta app (`vite.config.js` no los importa).

### 3. `@base44/sdk` — dependencia npm

Usada solo dentro de `base44/functions/*/entry.ts` (las 24 funciones legacy) y en 3 archivos
huerfanos bajo `src/functions/` (`fixEstimateDocumentType.js`, `sendEstimateEmail.js`,
`resolveAttachmentPublicUrl.js`) que **no estan importados desde ningun lado de `src/`**
(verificado con grep) — parecen restos muertos de una migracion anterior, no el codigo que corre
hoy.

### 4. `@base44/vite-plugin` — dependencia de build activa

`vite.config.js` lo importa y lo usa en el arreglo de `plugins`. A diferencia de todo lo demas,
**esto SI corre en cada build**. No se investigo que hace exactamente este plugin en tiempo de
build (podria ser algo minimo/vestigial, o algo que el build realmente necesita) — sacarlo requiere
probar un build completo despues, no asumir que es seguro solo por analogia con el resto.

### 5. Variables de entorno legacy

`src/config/env.js` mantiene `VITE_BASE44_APP_BASE_URL` como fallback de tercer nivel (despues de
`VITE_NEXART_APP_BASE_URL` y `VITE_APP_BASE_URL`). Bajo riesgo, cosmetico.

## Plan por etapas (para ir haciendo mientras se sigue desarrollando, no de una sola sesion)

**Etapa 0 (ya hecha):** sacar la API key hardcodeada de `base44/.app.jsonc`.

**Etapa 1 — cerrar las 7 llamadas rotas.** Esto no es limpieza de nombre, es arreglar produccion.
Para cada una: leer la implementacion real en `base44/functions/<nombre>/entry.ts`, portarla a
`supabase/functions/<nombre>/index.ts` siguiendo el patron ya usado en las 9 que se migraron bien
(reemplazar `createClientFromRequest` de `@base44/sdk` por `createAdminClient()` +
`supabaseEntities()` de `supabase/functions/_shared/supabaseEntities.ts`, mismo patron que
`resolveSigningCertificate` ya usa), desplegar, y verificar con una llamada real. Empezar por las
que tocan produccion/dinero/cliente antes que las internas:
1. `resolveEstimatePublicToken` y `resolveAttachmentPublicUrl` — el cliente no puede ver su
   estimate ni sus adjuntos hoy. Cash flow depende de esto (prioridad #2 en
   `OPERATING_PRIORITIES.md`, y el estimate es el primer paso de la cadena hacia el cobro).
2. `submitContactForm` — leads publicos perdidos silenciosamente (bueno, no tan silencioso, el
   usuario ve el error, pero el negocio no se entera de que perdio el lead).
3. `sendSignedEstimateCopy` — investigar primero si es un duplicado muerto de `sendSignedCopy` o
   un flujo real distinto, antes de portarlo.
4. `lowMarginAlert`, `approveMargin`, `agentTestRunner` — internas, menor urgencia.

**Etapa 2 — borrar el codigo huerfano.** Los 3 archivos en `src/functions/` que no importa nadie.

**Etapa 3 — una vez las 24 funciones de `base44/functions/` tengan su equivalente confirmado en
`supabase/functions/`:** borrar toda la carpeta `base44/` (funciones, entidades, config).

**Etapa 4 — sacar la dependencia de build.** Probar si `vite.config.js` sigue buildeando bien sin
`@base44/vite-plugin`; si si, sacarlo de `plugins` y de `package.json`. Sacar tambien
`@base44/sdk` de `package.json` (ya no lo usaria nadie despues de la etapa 3).

**Etapa 5 — limpieza cosmetica final:** sacar el fallback `VITE_BASE44_APP_BASE_URL` de
`src/config/env.js`, y revisar las referencias a "base44"/"proestimate-fsm" que quedan solo en
comentarios o docs (`docs/agent/EXECUTION_RULES.md`, `docs/agent/SYSTEM_MAP.md`,
`docs/fusion/FUSION_PHASES_STATUS.md`) — esas son historicas/informativas, no urgentes, se pueden
dejar como nota de contexto o limpiar al pasar por esos archivos por otro motivo.

## Regla para sesiones futuras

No borrar nada de `base44/` de una sola pasada. Cada funcion se porta, se despliega, se verifica
con una llamada real, y recien ahi se considera "migrada" — el mismo criterio que ya se uso hoy
para `resolveSigningCertificate` (Fase 6 de NexArtSign). Actualizar la tabla de arriba cada vez que
una de las 7 funciones rotas se cierre.
