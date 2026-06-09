# BUSINESS_RULES

## Proposito

Concentrar reglas de negocio base que ya deben guiar decisiones del agente.

## Modelo operativo principal

NexArtPro debe tratarse como ERP/FSM operativo y financiero.

Flujo base del negocio:

1. Lead
2. Cliente
3. Estimate
4. Firma legal
5. Work Order
6. Invoice
7. Payment
8. Reconciliacion
9. Expenses y Payroll
10. Profit y cash flow

## Reglas ya verificadas

### Firma y estimate

- NexArtSign existe como modulo real de firma.
- El estimate puede originar un `SigningPackage`.
- El backend actual puede cerrar legalmente el estimate y congelar PDF final.

### Estimate -> Work Order

- El backend de completion actual ya intenta convertir estimate firmado a work order.
- Esa conversion ocurre en `base44/functions/completeSigningPackage/entry.ts`.

### Work Order -> Invoice

- invoice nace desde work order en `src/lib/workOrderInvoiceConversion.js`
- no tratar invoice como equivalente a estimate firmado

### Money source of truth

- `payments[]` es la fuente de verdad del dinero recibido en invoice
- `invoice` representa obligacion de cobro, no confirmacion automatica de dinero

### Branding y company identity

- datos operativos de compania se cargan desde `company_settings`
- existen logos separados para documento, app y NexArtSign
- no hardcodear branding operativo si puede salir de settings

## Reglas de interpretacion

- estimate != invoice
- invoice != payment
- work order != invoice
- firma legal no debe absorber por si sola toda la logica operacional y financiera

## Regla de prioridad financiera

Cuando una decision toque dinero, proteger:

1. payments
2. balance_due
3. payment_status
4. consistencia entre invoice y flujo real de cobro

## Regla de documentos

Todo documento firmado debe aspirar a:

- trazabilidad
- evidencia tecnica
- PDF final inmutable
- certificado util

Si eso no existe o es parcial, marcarlo como gap y no darlo por resuelto.