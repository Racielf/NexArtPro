# NexArtSign UX Roadmap
## Basado en mejores prácticas de DocuSign, Adobe Sign, PandaDoc

---

## Fase A — Configuración de representante autorizado (PRÓXIMO)
- Agregar en NexArtSignSettingsCard:
  - `authorized_rep_name` — Nombre del representante de la empresa
  - `authorized_rep_title` — Título (ej: Project Manager)
  - `authorized_rep_signature` — Firma escrita o iniciales
- Esta info va al signing package como participante #1 (contra-firma)

## Fase B — Contra-firma automática de la empresa
- Al crear el paquete, agregar R.C Art Construction LLC como participante #1
- El cliente es participante #2
- La empresa firma primero (o se pre-firma al enviar)
- Se configura desde NexArtSign Settings

## Fase C — Experiencia de firma del cliente (SignDocumentView)
- Barra de progreso superior: "Paso 1 de 2 — Revisa el documento"
- Campos resaltados en amarillo indicando dónde firmar
- Botón "Next field →" que navega entre campos
- Pantalla de confirmación verde profesional al terminar
- Descarga del PDF firmado disponible al completar

## Fase D — Notificaciones completas
- Email al cliente cuando se envía el documento ✅ (ya funciona)
- Email a la empresa cuando el cliente VE el documento
- Email a la empresa cuando el cliente FIRMA
- Copia PDF final a ambas partes al completar

## Fase E — Email de firma profesional (ya implementado parcialmente)
- Header: logo de R.C Art Construction (no de NexArtSign)
- NexArtSign aparece solo en el footer como sello de seguridad
- Un solo botón CTA azul grande
- Texto de expiración del link

## Estándares de la industria aprendidos
- DocuSign: "Complete with DocuSign:" en el asunto del email
- Adobe Sign: PDF nativo visible antes de firmar (no imagen)
- Ambos: audit trail completo con timestamps e IP
- Ambos: certificado de completación con hash del PDF
- Counter-signature: la empresa siempre aparece como co-firmante
- NexArtSign ya tiene: OTP, hash SHA-256, certificado, audit trail ✅

## Flujo completo lead → firma (benchmark HouseCall Pro / Jobber)

### Lo que tienen los líderes del mercado:

PASO 1 — Lead capture
- Form en la web que crea el lead automáticamente
- Asignación de técnico desde el panel
- TODO: conectar Leads con Estimates en NexArtPro ✅ (ya existe)

PASO 2 — Visita y diagnóstico
- App móvil para crear estimado en campo
- Fotos del problema adjuntas al estimado
- TODO: mejorar EstimateEditor para móvil

PASO 3 — Estimado con opciones (FALTA)
- Good / Better / Best — 3 opciones de precio
- El cliente compara y elige desde su teléfono
- Auto-reminder a las 24h si no responde
- TODO: agregar MultiOption a EstimateEditor

PASO 4 — Firma (PARCIALMENTE IMPLEMENTADO)
- ✅ Online: email → link → firma digital (NexArtSign)
- ❌ En persona: firma en pantalla del técnico (falta)
- ✅ PDF firmado con timestamp y hash
- ❌ Auto-reminder si no firma en 24/48h (falta)

PASO 5 — Post-firma (FALTA)
- ❌ Conversión automática a Work Order al firmar
- ❌ Agendado automático del trabajo
- ✅ Copia PDF al cliente por email (funciona)
- ❌ Notificación push/email a la empresa cuando el cliente firma

### Prioridad de implementación:
1. Auto-reminder si no firma en 24/48h
2. Notificación a la empresa cuando el cliente firma
3. Multi-option estimates (Good/Better/Best)
4. Conversión automática a Work Order post-firma
5. Firma en persona desde móvil del técnico

## Estado actual de NexArtSign
- Fases 1-5 de seguridad: ✅ Completas
- Templates + Field Editor: ✅ Completo
- Fase 6 VerifyDocument: ✅ Completo
- Email profesional: ✅ Implementado
- Conectar estimados desde panel: ✅ Funcionando
- Fase A-E UX: ⏳ Pendiente
- Fase 7 Migración Supabase RLS: ⏳ Pendiente (para salir de Base44)