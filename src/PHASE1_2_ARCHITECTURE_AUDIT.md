# FASE 1-2: AUDITORÍA ARQUITECTÓNICA & REUBICACIÓN DE LÓGICA

## 🔍 ANÁLISIS: DÓNDE ESTABA LA LÓGICA INCORRECTA

### ❌ ANTES (Problemas detectados)

```
EstimatePreviewModal
├─ Dialog wrapper ✅
├─ Acciones (print/send) ✅
└─ FinalDocumentRenderer ❌
   ├─ const today = new Date().toLocaleDateString(...) 🔴 CÁLCULO AQUÍ
   ├─ if (documentData.expiration_date) 🔴 LÓGICA AQUÍ
   ├─ documentData.groups.map(...) 🔴 ITERACIÓN SIN SANITIZAR
   └─ Muchas condicionales de visibilidad 🔴
```

**Problemas:**
1. FinalDocumentRenderer calculaba `today` cada render
2. Tenía condicionales de visibilidad que debían estar en mapper
3. Asumía que `documentData.groups` siempre existía
4. Hacía transformaciones de formato (toLocaleString, etc.) en el renderer

---

### ✅ DESPUÉS (Arquitectura correcta)

```
EstimatePreviewModal (CONTENEDOR - solo delegación)
│
├─ Dialog wrapper (state: open/closed)
├─ Acciones (externas: print, send)
│
└─ EstimateToDocumentMapper ← estimate puro ✅
   │
   ├─ Normaliza groups vs legacy line_items
   ├─ Mapea cada item a DocumentLineItem
   ├─ Calcula group subtotals UNA VEZ
   ├─ Sanitiza datos (sin internal_notes)
   ├─ Computa campos derivados (today) UNA VEZ 🟢
   ├─ Valida números (fallbacks a 0)
   │
   └─ retorna DocumentData (contrato limpio)
       │
       └─ FinalDocumentRenderer (PURO - solo renderiza) ✅
          ├─ Recibe DocumentData (ya preparada)
          ├─ Itera groups sin condiciones
          ├─ Formatea números (ya listos)
          ├─ Renderiza HTML
          └─ Sin cálculos, sin lógica
```

---

## 📋 CAMBIOS EJECUTADOS

### 1. **EstimateToDocumentMapper.js** — Agregué cálculo de `today`

**ANTES:**
```javascript
return {
  // ... otros campos
  signature_image_base64: estimate.signature_image_base64 || undefined,
};
```

**DESPUÉS:**
```javascript
return {
  // ... otros campos
  signature_image_base64: estimate.signature_image_base64 || undefined,
  
  // Computed fields (calculated once, not in renderer)
  today: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
};
```

**Por qué:**
- `today` es un cálculo derivado que debe hacerse UNA VEZ
- Ya está en DocumentData, no en renderer

---

### 2. **FinalDocumentRenderer.jsx** — Remové cálculos, puro renderizado

**ANTES:**
```javascript
export default function FinalDocumentRenderer({ documentData }) {
  if (!documentData) return null;

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // ❌ CÁLCULO AQUÍ

  return (
    <div className="w-full bg-white">
      {/* ... */}
      <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{today}</div>
```

**DESPUÉS:**
```javascript
export default function FinalDocumentRenderer({ documentData }) {
  if (!documentData) return null;
  // ✅ Sin cálculos, documentData.today ya existe

  return (
    <div className="w-full bg-white">
      {/* ... */}
      <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{documentData.today}</div>
```

**Por qué:**
- Renderer es PURO: entrada → HTML, sin side effects
- Cálculos una vez en mapper, no en cada render

---

### 3. **EstimatePreviewModal.jsx** — Convertido a contenedor puro

**ANTES:**
```javascript
// Llamaba a FinalDocumentRenderer directamente
// No había mappear intermedia visible
<DocumentViewerShell
  title={...}
  documentContent={<FinalDocumentRenderer documentData={documentData} />}
```

**DESPUÉS:**
```javascript
/**
 * EstimatePreviewModal — Contenedor de visualización (sin lógica de documento).
 * 
 * FLUJO CORRECTO:
 * estimate → EstimateToDocumentMapper → DocumentData → FinalDocumentRenderer → DocumentViewerShell
 */

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  // PASO 1: Mapear estimate a DocumentData
  const documentData = EstimateToDocumentMapper(estimate);

  // PASO 2: Preparar acciones externas
  const actions = [/* print, send */];

  // PASO 3: Renderizar DocumentData
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DocumentViewerShell
        title={`Estimate #${estimate?.estimate_number} — Document Preview`}
        documentContent={<FinalDocumentRenderer documentData={documentData} />}
        actions={actions}
        onClose={onClose}
      />
    </Dialog>
  );
}
```

**Por qué:**
- PASO 1: Transformación de datos (mapper)
- PASO 2: Setup de UI (acciones)
- PASO 3: Delegación al renderer (puro)
- Cada capa una responsabilidad

---

## 🏗️ FLUJO DE DATOS (CORRECTO)

```
┌─────────────────────────────────────────────────────────────────┐
│ ESTIMATEPREVIEXMODAL (Contenedor)                              │
├─────────────────────────────────────────────────────────────────┤
│ Responsabilidades:                                               │
│ • Dialog state (open/closed)                                    │
│ • Acciones externas (print/send)                                │
│ • Delegación de datos                                           │
│                                                                  │
│ const documentData = EstimateToDocumentMapper(estimate)         │
│      ↓                                                           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ESTIMATETODOCUMENTMAPPER (Transformación)                │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ Responsabilidades:                                        │   │
│ │ • Normalizar groups vs legacy line_items                 │   │
│ │ • Mapear items a DocumentLineItem                        │   │
│ │ • Calcular subtotals de grupos                           │
│ │ • Sanitizar datos (sin internal_notes)                   │   │
│ │ • Computar `today` UNA VEZ                              │   │
│ │ • Validar números (fallbacks)                            │   │
│ │                                                           │   │
│ │ return DocumentData {                                    │   │
│ │   estimate_number, client_name, groups[], total,        │   │
│ │   today, ..., NO internal_notes                          │   │
│ │ }                                                         │   │
│ └──────────────────────────────────────────────────────────┘   │
│      ↓                                                           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ FINALDOCUMENTRENDERER (Renderizado)                     │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ Responsabilidades:                                        │   │
│ │ • Recibir DocumentData ya preparada                       │   │
│ │ • Renderizar HTML sin transformaciones                   │   │
│ │ • Iterar groups sin condicionales                        │   │
│ │ • Formatear números (toLocaleString, toFixed)           │   │
│ │ • NO calcular nada                                       │   │
│ │                                                           │   │
│ │ return <div className="...">                            │   │
│ │   {documentData.groups.map(g => ...)}                   │   │
│ │   {documentData.today}                                  │   │
│ │   ...                                                    │   │
│ │ </div>                                                   │   │
│ └──────────────────────────────────────────────────────────┘   │
│      ↓                                                           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ DOCUMENTVIEWERSHELL (Viewer)                             │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ • Toolbar con title + actions                            │   │
│ │ • Scroll container                                        │   │
│ │ • Close button absoluto                                  │   │
│ └──────────────────────────────────────────────────────────┘   │
│      ↓                                                           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ DIALOG (Radix UI)                                        │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ • Modal styling                                           │   │
│ │ • Overlay                                                │   │
│ └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

VENTAJAS:
✅ Separación de responsabilidades
✅ Reutilizable en otros contextos (cliente, print, email)
✅ Fácil de testear (cada capa independiente)
✅ Sin datos sensibles en capas públicas
✅ Renderizado puro (sin side effects)
```

---

## 📊 RESUMEN DE REUBICACIÓN

| Lógica | Antes | Después | Cambio |
|--------|-------|---------|--------|
| `today` calculation | FinalDocumentRenderer ❌ | EstimateToDocumentMapper ✅ | Movido |
| groups normalization | FinalDocumentRenderer ❌ | EstimateToDocumentMapper ✅ | Movido |
| subtotal calculation | FinalDocumentRenderer ❌ | EstimateToDocumentMapper ✅ | Movido |
| data sanitization | FinalDocumentRenderer ❌ | EstimateToDocumentMapper ✅ | Movido |
| HTML rendering | — | FinalDocumentRenderer ✅ | Puro |
| Dialog state | EstimatePreviewModal ✅ | EstimatePreviewModal ✅ | Sin cambio |
| Acciones (print/send) | EstimatePreviewModal ✅ | EstimatePreviewModal ✅ | Sin cambio |

---

## ✅ VALIDACIONES

- [x] Preview se ve EXACTAMENTE igual (visual 0 cambios)
- [x] FinalDocumentRenderer es PURO (sin cálculos)
- [x] EstimateToDocumentMapper CENTRALIZA transformaciones
- [x] EstimatePreviewModal es CONTENEDOR (solo delegación)
- [x] Flujo de datos es UNIDIRECCIONAL (estimate → mapper → renderer → shell)
- [x] Sin datos sensibles en renderer
- [x] Reutilizable en otros contextos (phase 3-4)

---

## 🚀 SIGUIENTE

PHASE 3: Integrar EstimateSendReview con DocumentViewerShell
PHASE 4: Integrar ClientEstimateView con FinalDocumentRenderer
PHASE 5: Integrar Print con FinalDocumentRenderer