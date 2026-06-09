# SYSTEM_MAP

## Proposito

Mapa operativo minimo del sistema, basado solo en rutas y archivos verificados en el repo real `Racielf/proestimate-fsm`.

## Estado de certeza

- Confirmado: existe una app React + Vite con rutas publicas, admin y field en `src/App.jsx`.
- Confirmado: existe un modulo NexArtSign con panel admin y vista publica de firma.
- Confirmado: existe un Brain bajo `src/brain/` y un modulo `securityBrain`.
- Confirmado: existe backend Base44 con funciones en `base44/functions/`.
- Inferido con alta confianza: el sistema opera como ERP/FSM ligero con ventas, ejecucion, firma y cobro conectados.
- Desconocido todavia: mapa completo de todas las entidades y todas las relaciones backend.

## Entrada principal

- Router principal: `src/App.jsx`

## Areas verificadas en rutas

### Publico

- `/`
- `/services`
- `/gallery`
- `/about`
- `/contact`
- `/partners`
- `/team-access`
- `/login`
- `/sign-document`
- `/client-estimate`
- `/proposal-view`
- `/client-portal`
- `/verify-document`

### Admin

- `/dashboard`
- `/leads`
- `/clients`
- `/appointments`
- `/estimates`
- `/work-orders`
- `/invoices`
- `/invoice-create`
- `/schedule-estimate`
- `/send-estimate`
- `/estimate-editor`
- `/time-tracking`
- `/customers`
- `/assignments`
- `/workers`
- `/payments`
- `/income-expenses`
- `/payroll`
- `/reports`
- `/profitability`
- `/proposals`
- `/sales-pipeline`
- `/proposal-editor`
- `/settings`
- `/recovery-center`
- `/security-dashboard`
- `/nexartsign`
- `/nexartsign-field-editor`
- `/agent`

### Field

- `/field`
- `/field/work-orders/:id`

## Modulos y archivos verificados

### NexArtSign

- `src/lib/nexArtSign.js`
- `src/pages/SignDocumentView.jsx`
- `src/pages/NexArtSign.jsx`
- `base44/functions/completeSigningPackage/entry.ts`
- `docs/nexartsign-security-roadmap.md`

Capacidades verificadas:

- creacion y reutilizacion de `SigningPackage`
- participantes secuenciales de firma
- emision de token por participante o paquete
- branding de firma desde settings
- completion backend con cierre firmado
- congelacion de PDF final
- generacion de `SigningCertificate`
- actualizacion legal del estimate
- conversion automatica estimate -> work order dentro de completion backend

### Settings y company config

- `src/lib/companySettings.js`
- `src/components/settings/CompanyPanel.jsx`
- `src/components/signing/NexArtSignSettingsCard.jsx`
- `src/hooks/useCompanyConfig.js`

Capacidades verificadas:

- `company_settings` vive en perfil del usuario actual
- branding operativo usa defaults desde `APP_CONFIG` y merge con settings guardados
- existen `logo_url`, `app_logo_url` y `nexartsign_logo_url`

### Brain

- `src/brain/modules/securityBrain.js`
- `src/pages/SecurityDashboardWithBrain.jsx`

Capacidades verificadas:

- hay Brain modular
- `securityBrain` analiza logs de seguridad y audit logs
- el Brain ya produce checks, severidades y sugerencias

### Work Orders -> Invoices

- `src/lib/workOrderInvoiceConversion.js`

Capacidades verificadas:

- invoice nace desde work order
- invoice se inicializa con `payments: []`
- `payments[]` se trata como fuente de verdad del dinero recibido
- se calcula `balance_due`
- `payment_status` arranca en `unpaid`

## Flujo operativo verificado parcialmente

1. Estimate se prepara y puede enviarse a firma.
2. NexArtSign crea `SigningPackage` y `SigningParticipant`.
3. La firma publica resuelve token y completa backend.
4. Backend congela PDF final y crea certificado.
5. Si el documento es estimate, se actualiza el estado legal del estimate.
6. En el backend actual, estimate firmado puede convertirse a work order.
7. Invoice nace desde work order, no desde la firma del estimate.

## Limites actuales del mapa

- No asumir que este archivo cubre todas las entidades.
- No asumir que todas las rutas tienen endurecimiento backend equivalente.
- Reconfirmar cada archivo real antes de implementar cambios.