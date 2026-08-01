# AGENTS.md — NexArtPro

Este archivo gobierna todo el repositorio. Su objetivo es que cualquier agente identifique el proyecto correcto, recupere el contexto vigente y no vuelva a reconstruir módulos ya estabilizados.

## 1. Identidad y ruta oficial

- Producto: **NexArtPro**.
- Empresa: **R.C Art Construction LLC**.
- Repo de trabajo oficial:
  `D:\My Bussines\SQL BSE\Fusion System\Agent\02-working-main\NexArtPro-main`
- La carpeta `01-source-readonly` y otros repos llamados NexArtProV3 son referencias, no destinos de edición.
- El prototipo aprobado del Estimate Editor está en:
  `D:\My Bussines\SQL BSE\Fusion System\Agent\00-zips\Pipeline para estimate editor-handoff.zip`

Antes de editar, confirmar que el directorio actual contiene este archivo y `package.json`.

## 2. Lectura obligatoria al comenzar

Leer completos, en este orden:

1. `AGENT_BOOTSTRAP.md`
2. `docs/agent/SYSTEM_MAP.md`
3. `docs/agent/OPERATING_PRIORITIES.md`
4. `docs/agent/EXECUTION_RULES.md`
5. `docs/agent/BUSINESS_RULES.md`
6. `docs/agent/OPEN_GAPS.md`
7. `CLAUDE.md`
8. La documentación específica de la tarea.

Para Estimate Editor, leer además:

- `docs/estimate-editor-handoff-2026-07-31.md`
- `docs/i18n-architecture.md`
- `docs/estimate-system-status.md`
- `docs/estimates-redesign-context.md`

Los documentos históricos pueden describir estados anteriores. Para el Estimate Editor, el handoff fechado más reciente prevalece sobre descripciones antiguas del layout.

## 3. Límites operativos

Sin aprobación explícita del propietario, no:

- ejecutar SQL ni aplicar migraciones;
- modificar Auth, RLS o Storage;
- leer, mostrar o reutilizar credenciales de `.env.local`;
- conectar servicios remotos o ejecutar pruebas que escriban datos reales;
- modificar `work_orders`;
- hacer commit, push, merge, deploy o cambios en Vercel;
- realizar refactors globales o reemplazar arquitectura estable;
- tocar `src/components/ui/` salvo necesidad demostrada.

El permiso para editar UI local no autoriza cambios de base de datos ni despliegues.

## 4. Reglas técnicas esenciales

- Usar `nexartClient`; no importar Supabase directamente en componentes.
- La lógica financiera de estimates vive en `src/lib/estimateEngine.js`.
- No crear un tercer motor de cálculo ni copiar fórmulas dentro de componentes o plantillas.
- `unit_price` determina el total del cliente; `unit_cost` es costo interno; `book_price` es referencia.
- Mantener soft delete/archivo. No introducir borrado duro desde frontend.
- Preservar `ProposalEditor.jsx`: comparte partes históricas del sistema de estimates.
- Usar iconos de `lucide-react`.
- Mantener cambios mínimos y revisar primero el estado sucio del worktree.

## 5. Contrato actual del Estimate Editor

La ruta activa es `/estimate-editor?id=<estimate-id>` y el shell vive en `src/pages/EstimateEditor.jsx`.

El diseño aprobado es el prototipo **Pipeline para estimate editor**, no el layout técnico anterior de tres columnas.

Estructura visual vigente:

- header orgánico y compacto con número de estimate, template, estado de guardado, herramientas y acción principal;
- columna izquierda de 320 px con cliente, ubicación, tareas y secciones auxiliares;
- columna principal centrada con e-sign, pipeline, encabezado del presupuesto, Partidas y Actividad;
- funciones técnicas avanzadas dentro del panel secundario **Ajustes**, no como rail persistente;
- sin medidor financiero pegajoso en la parte inferior;
- sin toast de éxito por cada autosave. El estado de guardado se comunica en el header; los errores sí pueden usar toast.
- las notificaciones Sonner globales permanecen en `bottom-right` para no cubrir las acciones del header.
- no mostrar “Opción #1” ni “Añadir opción”: NexArtPro no tiene todavía un flujo real de alternativas del mismo estimate. Solo reintroducirlo con modelo, persistencia y acciones completas.
- la tarjeta superior de propiedad es exclusivamente para la fachada/Street View: usa la imagen cuando existe `VITE_GOOGLE_MAPS_API_KEY` y Google tiene cobertura; sin clave o sin cobertura muestra un estado neutro, nunca duplica el mapa de ubicación inferior.
- una foto propia subida desde esa tarjeta se guarda mediante `nexartClient.integrations.Core.UploadFile` y una fila `ProjectPhoto` con `category: 'property'` y `customer_id`; tiene prioridad visual sobre Street View. No copiar ni rehostear imágenes de Google en Supabase.

Componentes específicos del rediseño:

- `src/components/estimates/EstimatePipelineDocument.jsx`
- `src/components/estimates/EstimatePipelineSidebar.jsx`
- `src/components/estimates/EstimateActionsPanel.jsx`
- `src/components/estimates/estimatePipelineTheme.js`

No reactivar `EstimateGroups.jsx` dentro de `EstimateEditor.jsx` sin investigar primero por qué fue sustituido. Continúa existiendo para compatibilidad con otros flujos.

## 6. Método de trabajo esperado

1. Inspeccionar antes de editar y localizar la causa concreta.
2. Separar presentación de reglas de negocio.
3. Reutilizar funciones existentes; no duplicarlas.
4. Verificar la ruta real en navegador local cuando cambie UI.
5. Evitar acciones de navegador que creen, guarden, envíen, aprueben o eliminen datos reales sin autorización específica.
6. Documentar decisiones y pendientes en un handoff del módulo.
7. Reportar claramente qué se cambió, qué se verificó y qué no se ejecutó.

## 7. Validación local

Para cambios del Estimate Editor:

```powershell
npx eslint src/pages/EstimateEditor.jsx src/components/estimates/EstimatePipelineDocument.jsx src/components/estimates/EstimatePipelineSidebar.jsx src/components/estimates/EstimateActionsPanel.jsx
npm run build
git diff --check
```

No ejecutar `npm run lint:fix`. Las advertencias preexistentes de otras plantillas no deben mezclarse con el alcance salvo que rompan el build.

## 8. Windows y codificación

- El repo está sobre NTFS y contiene texto Unicode.
- No usar `sed -i` ni reemplazos masivos inseguros.
- Conservar UTF-8 y revisar que no aparezca mojibake.
- Usar parches pequeños y verificar los archivos modificados.

## 9. Cierre de sesión

- No afirmar que algo funciona solo porque compila; hacer QA proporcional al riesgo.
- No limpiar ni revertir cambios ajenos del worktree.
- No hacer commit/push/deploy salvo autorización explícita en la conversación actual.
- Dejar el siguiente paso y cualquier limitación real documentados.

## 10. Idiomas

- La infraestructura global vive en `src/lib/i18n.jsx`.
- Español es el fallback; inglés está disponible desde Settings → General.
- `document_language` del estimate y el idioma operativo de la interfaz son conceptos distintos.
- Agregar traducciones por módulo usando claves semánticas; no introducir condicionales de idioma en cálculos o reglas de negocio.
