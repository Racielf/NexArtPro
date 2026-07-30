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
| `resolveEstimatePublicToken` | **NO** | `src/pages/ClientEstimateView.jsx:38` — vista publica del estimate que ve el cliente |
| `resolveAttachmentPublicUrl` | **NO** | `src/components/estimates/ClientAttachmentsSection.jsx:32` — adjuntos del estimate |
| `lowMarginAlert` | **NO** | `src/pages/EstimateEditor.jsx:209` |
| `approveMargin` | **NO** | `src/components/estimates/internal/PricingOverrideModal.jsx:67` |
| `agentTestRunner` | **NO** | `src/components/settings/AgentTestRunnerPanel.jsx:21` |
| `sendSignedEstimateCopy` | **NO** | `src/lib/nexArtSignCompletion.js:141` — posible bug de nombre duplicado, ver nota abajo |

Confirmado que `Contact.jsx` tiene try/catch que muestra el error al usuario (`"An error occurred.
Please try again."`) — no falla en silencio. Cualquiera que llene el formulario de contacto
publico del sitio hoy deberia estar viendo ese error.

**Nota sobre `sendSignedEstimateCopy` vs `sendSignedCopy`:** existe una funcion `sendSignedCopy`
(sin "Estimate") que SI esta desplegada y funciona (`src/pages/SignDocumentView.jsx:457`). Es
posible que `nexArtSignCompletion.js` sea codigo viejo/no usado en el flujo activo, o un segundo
flujo de completion que nunca se termino de portar. No investigado a fondo — anotar antes de
tocarlo.

Funciones que SI se migraron correctamente y funcionan hoy (para referencia, no tocar):
`sendEstimateEmail`, `sendEmail`, `issueSigningAccessLink`, `resolveSigningPackageToken`,
`requestSigningOtp`, `verifySigningOtp`, `sendSignedCopy`, `completeSigningPackage`,
`resolveSigningCertificate`, `createStripeCheckoutSession`.

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
