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

## Estado actual de NexArtSign
- Fases 1-5 de seguridad: ✅ Completas
- Templates + Field Editor: ✅ Completo
- Fase 6 VerifyDocument: ✅ Completo
- Email profesional: ✅ Implementado
- Conectar estimados desde panel: ✅ Funcionando
- Fase A-E UX: ⏳ Pendiente
- Fase 7 Migración Supabase RLS: ⏳ Pendiente (para salir de Base44)