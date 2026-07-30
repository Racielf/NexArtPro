# Vision futura — NexArtPro como SaaS multi-tenant con integraciones configurables y onboarding de datos propios

> Capturado 2026-07-30. Esto es vision de producto, NO un plan de ejecucion — el dueno pidio
> explicitamente documentarlo para meterlo luego, no arrancarlo ahora. Antes de ejecutar cualquier
> parte de esto, hacer research + plan propio (Plan mode), como se hizo con NexArtSign y como se
> hara con el rediseño de Estimates.

## Contexto — como surgio

Al decidir que Twilio (SMS) se deja como integracion opcional en vez de conectarla ahora (ver
`docs/agent/BASE44_REMOVAL_PLAN.md`, `lowMarginAlert`), el dueno se dio cuenta de un patron mas
grande: si en algun momento se vende NexArtPro como software por suscripcion mensual a otras
empresas de contratistas, muchas de estas decisiones (que integraciones usar, que datos traer)
deberian ser **configurables por empresa**, no fijas para R.C Art Construction LLC como hoy.

## Idea 1 — Integraciones configurables por empresa (Twilio es solo el primer ejemplo)

Hoy, decisiones como "¿usamos SMS o solo email?" estan implicitas en el codigo (Twilio nunca se
conecto, se usa Resend/email en su lugar — ver `docs/agent/BASE44_REMOVAL_PLAN.md`). En un modelo
SaaS, cada empresa cliente deberia poder elegir/configurar sus propias integraciones desde un
panel de Settings, por ejemplo:

- Canal de notificaciones: email (Resend) vs. SMS (Twilio u otro proveedor) vs. ambos.
- Proveedor de firma electronica: NexArtSign (propio) vs. quiza integrar con uno externo en el
  futuro (aunque el rumbo actual, ver `docs/nexartsign-security-roadmap.md`, es mantener NexArtSign
  propio).
- Proveedor de pagos: ya existe `createStripeCheckoutSession` — en un modelo multi-empresa, cada
  cliente podria necesitar sus propias credenciales/cuenta de Stripe (Stripe Connect es el patron
  estandar de la industria para esto), no una cuenta de Stripe compartida.
- Cualquier otra integracion futura (calendarios, contabilidad externa, etc.) deberia nacer
  pensada como "opcional, configurable por empresa" desde el dia 1, no hardcodeada.

## Idea 2 — Onboarding trayendo la base de datos propia del cliente

La pieza mas grande de la vision: cuando una empresa nueva se suscribe a NexArtPro, deberia poder
**traer sus datos existentes** en vez de empezar de cero — igual que QuickBooks u otras
plataformas de gestion dejan importar clientes/contactos/catalogos existentes al darse de alta.
Datos mencionados explicitamente por el dueno: contactos, documentos, precios, clientes — "todo lo
relacionado con clientes".

Dos caminos posibles, no mutuamente excluyentes:

1. **Conectar una base de datos externa propia** — la empresa cliente ya tiene su propia base de
   datos (en algun otro sistema) y la conecta/configura para que NexArtPro lea/sincronice desde
   ahi, en vez de migrar los datos a la base de NexArtPro.
2. **Importar archivos en formatos conocidos** — CSV, Excel (.xlsx), u otros formatos estandar de
   exportacion de bases de datos, que el sistema parsea y carga a las tablas correspondientes
   (clients, price_book_entries, etc.) durante el onboarding.

## Relacion con trabajo previo (no reemplaza, es un salto de alcance)

`src/docs/MULTI_TENANT_MIGRATION_PLAN.md` (2026-04-07, "Planning — NOT YET EXECUTED") ya proponia
agregar un campo `company_id` a las entidades core para aislar datos por empresa. Ese documento
esta **desactualizado en su mecanica** (escrito contra `base44.entities`/queries estilo MongoDB,
de la era pre-Supabase — ver `docs/agent/BASE44_REMOVAL_PLAN.md` para el contexto completo de esa
migracion), pero el concepto de fondo (`company_id` como columna de aislamiento) ya esta parcialmente
en produccion hoy: la regla 4 de `CLAUDE.md` exige `company_id: 'rc-art'` en todo `.create()`, y
varias tablas reales ya tienen la columna `company_id` (confirmado en las auditorias de RLS de
TAREA G). Osea, la base tecnica de aislamiento por empresa **ya existe**, con un solo valor
("rc-art") en uso. La vision de hoy es el paso siguiente: multiples valores de `company_id` reales
(multi-tenant de verdad), mas todo lo de integraciones configurables e importacion de datos que el
plan viejo nunca contemplaba.

## Que NO se decide en este documento (a proposito)

- Modelo de precios/suscripcion (mensual, por usuario, por modulo, etc.) — decision de negocio del
  dueno, no tecnica.
- Si el aislamiento multi-tenant sera "una base de datos Supabase por empresa" o "una base
  compartida con RLS por `company_id`" — son dos arquitecturas muy distintas en costo/complejidad/
  aislamiento de seguridad, hay que evaluarlas cuando se retome esto, no asumir una.
- Que formato(s) de importacion soportar primero (CSV es el mas simple; Excel y conexion a bases
  externas son mas complejos) — priorizar cuando haya mas claridad de que pide el primer cliente
  real fuera de R.C Art Construction.
- Si integrar Stripe Connect (u otro patron multi-cuenta) para pagos por empresa.

## Por que esto importa para decisiones de hoy (aunque no se ejecute nada todavia)

Aunque no se construya nada de esto ahora, **conviene que las decisiones tecnicas de hoy no
cierren la puerta** a esta vision futura. Ejemplos concretos ya anotados en otros documentos que
aplican esta misma logica:

- `docs/agent/OPEN_GAPS.md` / memoria del agente ya dice (para el futuro modulo externo de Work
  Orders) que el modelo de roles de hoy (`role` binario admin/agente) no debe asumirse como la
  unica fuente de autorizacion posible — dejar espacio para una capa de permisos por modulo. Lo
  mismo aplica aca: no asumir que `company_id = 'rc-art'` es la unica empresa que va a existir
  nunca en el codigo nuevo que se escriba.
- Cualquier integracion nueva que se conecte de ahora en adelante (siguiendo la disciplina de
  "reusar antes que inventar" ya aplicada hoy con `lowMarginAlert`/`approveMargin`) deberia
  preguntarse: "si esto se vuelve configurable por empresa mas adelante, ¿el diseño de hoy lo
  permite sin reescritura completa?" — sin necesidad de construir la configurabilidad ahora.

## Siguiente paso natural (cuando el dueno decida retomar esto)

Una sesion de Plan mode dedicada, con research de: (1) patrones reales de multi-tenancy en
Supabase (RLS por `company_id` vs. proyectos separados vs. schemas separados), (2) como otras
plataformas de este tipo (QuickBooks, ServiceTitan, Jobber) resuelven el onboarding de datos
existentes, (3) alcance real del primer cliente hipotetico fuera de R.C Art Construction para no
sobre-diseñar sin necesidad concreta.
