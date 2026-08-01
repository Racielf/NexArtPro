# Estimate Editor — handoff de implementación 2026-07-31

## Objetivo aprobado

Reconstruir la experiencia visual del Estimate Editor usando como contrato el prototipo incluido en:

`D:\My Bussines\SQL BSE\Fusion System\Agent\00-zips\Pipeline para estimate editor-handoff.zip`

El propietario autorizó reemplazar la UI recargada del editor y después reincorporar funciones existentes de manera controlada. La decisión técnica fue conservar el motor y la persistencia existentes, sustituyendo el shell visual en vez de borrar reglas de negocio valiosas.

## Problema anterior

La implementación previa convirtió el editor en una vista técnica de tres columnas:

- catálogo/cliente a la izquierda;
- documento y medidor financiero al centro;
- pricing, validez, cerebro e historial en un rail permanente a la derecha.

Ese enfoque no correspondía al prototipo aprobado. Exponía demasiada información interna al mismo tiempo y hacía difícil crear un presupuesto como documento.

## Arquitectura visual vigente

`src/pages/EstimateEditor.jsx` ahora presenta:

1. Header orgánico con número de estimate, template, estado de guardado, herramientas y acción principal.
2. Sidebar de 320 px mediante `EstimatePipelineSidebar.jsx`.
3. Columna principal centrada de hasta 1040 px.
4. Banner de firma electrónica.
5. Pipeline de seis etapas mediante `EstimateActionsPanel.jsx`.
6. Tarjeta de encabezado del presupuesto.
7. Documento compacto de Partidas mediante `EstimatePipelineDocument.jsx`.
8. Tarjeta de Actividad.
9. Panel secundario **Ajustes** para pricing, validez, cerebro e historial.

El rail derecho persistente y el medidor inferior pegajoso quedaron fuera de la experiencia visible.

## Decisiones funcionales

- `EstimatePipelineDocument.jsx` continúa usando `runEstimateEngine`; no implementa fórmulas paralelas.
- Los grupos y materiales se normalizan con utilidades existentes.
- Se mantiene el autosave existente del editor.
- El resultado exitoso del autosave se muestra con `SaveStateIndicator` dentro del header.
- Se eliminó el `toast.success("Estimate #... saved")` del autosave porque duplicaba el feedback y cubría los controles superiores derechos.
- El `SonnerToaster` global se movió de `top-right` a `bottom-right`; otros avisos ya no pueden cubrir **Revisar y enviar** ni **Cerrar**.
- Los errores de guardado continúan visibles.
- `EstimateGroups.jsx` no fue eliminado: puede seguir siendo necesario para `ProposalEditor.jsx` y compatibilidad histórica.

## Archivos del cambio

- `src/pages/EstimateEditor.jsx`
- `src/components/estimates/EstimatePipelineDocument.jsx`
- `src/components/estimates/EstimatePipelineSidebar.jsx`
- `src/components/estimates/EstimateActionsPanel.jsx`
- `src/components/estimates/estimatePipelineTheme.js`
- `AGENTS.md`

## QA realizado

- La ruta local `/estimate-editor?id=68e3f9f1-d958-450c-b4e1-29cec4d52a30` fue abierta en navegador.
- Se verificó que renderiza el estimate #1030 con cliente, mapa, pipeline, Partidas y Actividad.
- Se corrigió un fallo de runtime por una referencia residual a `marginClass`.
- El estimate de QA quedó restaurado en `0 servicios · 0 materiales`.
- ESLint de los archivos del rediseño pasó.
- El build de Vite pasó.

## Pendientes controlados

- Tareas, campos personalizados, etiquetas y notas privadas del sidebar ya son editables. Tareas/campos/etiquetas se guardan bajo `estimate.metadata.pipeline_editor`; notas privadas usan `internal_notes`.
- Los controles falsos de opciones múltiples, Plantillas dentro de Partidas y tabla/lista fueron retirados. No deben reaparecer hasta existir un flujo real.
- El rótulo residual “Opción #1” también fue retirado el 2026-08-01: no existía modelo ni persistencia de múltiples opciones. El header muestra el número real del estimate.
- La tarjeta de propiedad resuelve primero `estimate.client_address` y luego la dirección de servicio completa del cliente. Con `VITE_GOOGLE_MAPS_API_KEY` usa Street View Static API y `return_error_code=true`; si falta la clave o Google no tiene cobertura, muestra un estado neutro enlazado a Google Maps. La tarjeta superior nunca duplica el mapa inferior: está reservada para la fachada/Street View.
- El banner de e-sign abre el módulo real `/nexartsign`; ya no simula una activación local.
- El selector de servicios/materiales evita persistir filas completamente vacías durante el autosave.
- La vista pública del cliente y la consistencia PDF/email deben revisarse separadamente; no mezclarlas con cambios cosméticos del editor.
- Hacer pruebas de persistencia únicamente con autorización para escribir datos de QA.

## Idiomas

- Se añadió `LanguageProvider` global sin dependencias externas.
- Settings permite elegir español o inglés y persiste la preferencia en el dispositivo.
- Estimate Editor tiene cobertura bilingüe en el shell visible, pipeline, sidebar y Partidas.
- Ver `docs/i18n-architecture.md` para ampliar otros módulos o idiomas.

## Auditoría funcional del UI reconstruido

| Área | Estado |
|---|---|
| Template del documento | Conectado a `handleTemplateChange` |
| Estado de guardado | Conectado; feedback compacto dentro del header |
| Pricing assistant | Abre panel real del brain |
| Health check | Conectado en desarrollo |
| Vista previa del editor | Conectada |
| Vista del cliente | Conectada |
| Revisar y enviar | Conectado al flujo existente |
| Cliente | Edición conectada |
| Mapa/contacto | Enlaces conectados |
| Tareas | CRUD conectado a metadata |
| Campos | CRUD conectado a metadata |
| Etiquetas | CRUD conectado a metadata |
| Notas privadas | Edición conectada a `internal_notes` |
| Adjuntos | Componente existente conectado |
| Comunicaciones | Timeline existente conectado |
| Ajustes avanzados | Drawer existente conectado |
| Servicios/materiales | Añadir, editar y eliminar conectados al motor/autosave |
| E-sign | Navega al módulo NexArtSign real |

## Límites respetados en esta intervención

No se ejecutó SQL, no se modificó Auth/RLS/Storage, no se usaron credenciales, no se hizo commit, push ni deploy.
