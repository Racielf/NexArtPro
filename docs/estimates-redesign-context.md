# Estimates — contexto para el rediseño futuro

## Proposito

El dueno (Racielf) confirmo el 2026-07-30 que quiere rediseñar el modulo de Estimates por completo
en una sesion dedicada, en vez de seguir parchando encima de lo que hay. Este archivo captura el
"por que" antes de que se pierda, para que esa sesion futura no tenga que re-preguntar todo desde
cero.

**No usar este archivo como excusa para arrancar el rediseño sin alinear alcance primero** — es
contexto de entrada, no un plan. Cuando se retome, hacer research + plan propios (Plan mode),
como se hizo con NexArtSign.

## Por que quiere rediseñarlo (palabras del dueno, distiladas)

- **El armado del documento en si** ("realmente hacía este documento") fue el punto de mas
  fricción: los agentes que trabajaron en esto antes mezclaban los calculos, y hubo problemas de
  plantillas repetidos.
- Para intentar resolver eso, en algun momento se creo un "cerebro" autonomo (`src/brain/`,
  `securityBrain` — ver `docs/agent/SYSTEM_MAP.md`) pensado para vigilar los calculos y el sistema
  en general. Segun el dueno, esto termino mezclandose con temas de seguridad y borrado de
  archivos, y hay 2-3 cosas relacionadas con seguridad que "no funcionan bien" como resultado —
  sin identificar todavia cuales exactamente. **Investigar el alcance real de `src/brain/` /
  `securityBrain` y que tanto se solapa con seguridad antes de tocar nada ahi** cuando se retome
  esto.
- Las plantillas del documento no funcionaban bien.
- Modelo de borrado: en vez de borrar de verdad, el sistema debia "archivar" — lo archivado va a
  un lugar que solo el admin puede ver y restaurar. El dueno dice que esto sigue siendo la
  intencion hoy. Consistente con lo que confirmamos en el schema real: `estimates` tiene
  `deleted_at`/`deleted_by`/`delete_reason`/`restored_at`/`restored_by` como columnas reales — el
  mecanismo de soft-delete/archivo si existe a nivel de datos. Verificar si la UI de
  "restaurar solo admin" esta completa cuando se retome.
- Envio del estimate al correo del cliente con copia a la empresa, y que ese documento enviado
  quedara guardado/versionado — parte de la frustracion viene de que esto se mezclo con lo demas.
- El paquete de firma (NexArtSign) para estimates: hubo un momento en que firmar funcionaba, y se
  rompio despues por cambios de otros agentes que "arreglaban algo y rompian otra cosa". Esto
  coincide con lo que encontramos hoy tecnicamente: la tabla `estimates` en produccion no tiene
  `signing_package_token`, `signing_package_status`, `attachments`, ni `document_config` — o sea
  la integracion Estimate <-> NexArtSign esta rota a nivel de datos ahora mismo, no solo de UI.

## Resumen de la causa raiz tecnica (verificada 2026-07-30, ver tambien `docs/agent/BASE44_REMOVAL_PLAN.md`)

El schema real de `estimates` en produccion no coincide con lo que varias partes del codigo
(frontend activo y la funcion vieja de Base44 por igual) asumen. Ejemplo confirmado: faltaban
`public_share_token`/`public_share_token_created_at` (ya agregadas, ver plan de Base44) — pero
siguen faltando `attachments`, `document_config`, columnas de integracion con el paquete de firma,
y datos del PDF final firmado. Ademas, `supabase/migrations/001_core_tables.sql` (que SI declara
estas columnas) **nunca se aplico a produccion** — hubo cambios de schema reales aplicados directo
contra la base en el pasado sin quedar versionados en el repo (ver migracion
`fix_estimates_schema_add_missing_columns`, aplicada 2026-06-08, sin archivo local
correspondiente). Esto es evidencia dura de la frustracion que describe el dueno: cambios hechos
sin disciplina de versionado, por multiples agentes, sin una vision unificada.

## Referencia de diseño mencionada por el dueno (2026-07-30)

El dueno tiene un prototipo hecho con Claude (herramienta de diseño) para NexArtProV3 cuya
interfaz le gusta mucho, y quiere usarlo como referencia para el rediseño de Estimates. Vive en el
workspace de esta sesion (no en este repo): `D:\My Bussines\Strategy\Google Anti Gravity\NexArtProV3`.
Tiene su propio flujo de Estimates completo y separado —
`src/EstimateEditor.jsx`, `src/EstimatesPage.jsx`, `src/EstimateViewPage.jsx`,
`src/estimateMath.jsx` / `src/services/estimateMath.jsx`, `src/hooks/useEstimates.js` — util como
punto de partida visual, no necesariamente como codigo a copiar 1:1 (es un proyecto Supabase
aparte, con su propio schema — no asumir que coincide con el de NexArtPro sin revisar). Revisarlo
a fondo cuando arranque la sesion de rediseño, no antes.

**Ojo — existen 2 copias de NexArtProV3, usar la de Google Anti Gravity, no la del Agent:**
`D:\My Bussines\SQL BSE\Fusion System\Agent\01-source-readonly\NexArtProV3-main` es una copia
congelada de solo lectura (mencionada en el `CLAUDE.md` de esa carpeta como "referencia estetica"),
mas vieja que `D:\My Bussines\Strategy\Google Anti Gravity\NexArtProV3` — esta ultima tiene
archivos mas recientes (`SESION_LEADS_PUBLIC.md`, scripts de fix de encoding, un `dist/` de build
reciente). Para diseño, usar la de Google Anti Gravity.

## Que preguntar / decidir cuando se retome (no decidir ahora)

1. Adjuntos del estimate: donde y como se van a guardar de verdad (JSONB en la tabla vs tabla
   propia `estimate_attachments`) — ahora mismo no existen de ninguna forma.
2. Integracion con NexArtSign: como se conecta un estimate con su `signing_package` de forma
   confiable (hoy no hay ninguna columna que los relacione en `estimates`).
3. Que hacer con `src/brain/` / `securityBrain` — separar lo que sea legitimamente
   seguridad/auditoria de lo que sea logica de negocio de Estimates, en vez de tenerlo mezclado.
4. Confirmar el modelo de plantillas (`document_config`, `template_id` ya existe como columna) y
   si vale la pena mantenerlo o repensarlo desde cero.
5. Migraciones: establecer disciplina real de que todo cambio de schema en produccion pasa por un
   archivo en `supabase/migrations/` commiteado — la falta de esto es probablemente la causa de
   fondo de gran parte de la frustracion pasada, no solo un detalle de higiene.

## Que NO tocar sin conversarlo primero

- `work_orders` (regla existente, `CLAUDE.md` seccion 4).
- El arreglo puntual ya aplicado (`public_share_token` + `resolveEstimatePublicToken`) — es
  independiente del rediseño, no hace falta deshacerlo ni repetirlo.
