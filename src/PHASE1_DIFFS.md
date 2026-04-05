# FASE 1: DOCUMENT VIEWER SHELL – PROPUESTA DE DIFFS

## ARCHIVOS CREADOS ✅

```
✨ components/documents/GlobalDocumentCloseButton.jsx
✨ components/documents/DocumentViewerShell.jsx
```

---

## ARCHIVOS A MODIFICAR (CUANDO AUTORICES)

### 1. `components/estimates/EstimatePreviewModal.jsx`

**CAMBIO:** Reemplazar DialogContent + toolbar manual por DocumentViewerShell

#### ANTES (23 líneas):
```jsx
import React from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentCloseButton from '@/components/shared/DocumentCloseButton';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { printEstimate } from '@/lib/estimatePrint';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0 gap-0 flex flex-col" showCloseButton={false}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0 pr-14">
          <span className="text-sm font-semibold text-slate-700">
            Estimate #{estimate?.estimate_number} — Document Preview
          </span>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => printEstimate(estimate)} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            {onSend && (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={() => { onClose(); onSend(); }}>
                <Send className="w-3.5 h-3.5" /> Send to Client
              </Button>
            )}
            <DialogClose asChild>
              <DocumentCloseButton />
            </DialogClose>
          </div>
        </div>
        {/* Document Scrolleable Container */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6 min-h-0">
          <div className="shadow-xl rounded-sm overflow-hidden">
            <EstimateTemplateRenderer
              estimate={estimate}
              template={estimate?.document_config?.template || 'professional'}
              options={{ ...DEFAULT_OPTIONS, ...estimate?.document_config?.options }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### DESPUÉS (propuesto):
```jsx
import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import DocumentViewerShell from '@/components/documents/DocumentViewerShell';
import EstimateTemplateRenderer from './EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';
import { printEstimate } from '@/lib/estimatePrint';

export default function EstimatePreviewModal({ estimate, open, onClose, onSend }) {
  const documentContent = (
    <div className="shadow-xl rounded-sm overflow-hidden">
      <EstimateTemplateRenderer
        estimate={estimate}
        template={estimate?.document_config?.template || 'professional'}
        options={{ ...DEFAULT_OPTIONS, ...estimate?.document_config?.options }}
      />
    </div>
  );

  const actions = [
    <Button key="print" size="sm" variant="outline" onClick={() => printEstimate(estimate)} className="gap-1.5">
      <Printer className="w-3.5 h-3.5" /> Print / PDF
    </Button>,
    onSend ? (
      <Button key="send" size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={() => { onClose(); onSend(); }}>
        <Send className="w-3.5 h-3.5" /> Send to Client
      </Button>
    ) : null,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DocumentViewerShell
        mode="modal"
        title={`Estimate #${estimate?.estimate_number} — Document Preview`}
        documentContent={documentContent}
        actions={actions}
        onClose={onClose}
      />
    </Dialog>
  );
}
```

#### CAMBIOS PRECISOS:
- ❌ Remover: `DialogContent`, toolbar manual, `DocumentCloseButton`, wrapper document
- ✅ Agregar: `DocumentViewerShell`, acciones como array
- ✅ Mantener: lógica de print/send, EstimateTemplateRenderer, Dialog wrapper

---

## NO MODIFICAR (AÚN)

### 2. `components/estimates/EstimateSendReview.jsx`
→ Será modificado en FASE 2 (para reutilizar DocumentViewerShell en modo fullscreen)

### 3. `lib/estimatePrint.js`
→ Será modificado en FASE 3 (para usar FinalDocumentRenderer)

### 4. `pages/ClientEstimateView.jsx`
→ Será modificado en FASE 4 (para usar DocumentViewerShell en modo client)

---

## VERIFICACIÓN VISUAL

| Aspecto | Antes | Después | Estado |
|--------|-------|---------|--------|
| Ancho | Dialog max-w-4xl | DocumentViewerShell w-full max-w-4xl | ✅ Idéntico |
| Scroll | overflow-y-auto | flex-1 overflow-y-auto | ✅ Idéntico |
| Padding | p-6 | p-6 (en scroll container) | ✅ Idéntico |
| Background | bg-slate-200 | bg-slate-200 | ✅ Idéntico |
| Toolbar | manual, flex | DocumentViewerShell automático | ✅ Idéntico |
| X | DocumentCloseButton en DialogClose | GlobalDocumentCloseButton en shell | ✅ Idéntico |
| Document shadow | shadow-xl | shadow-xl | ✅ Idéntico |

---

## ESTADO: LISTO PARA IMPLEMENTACIÓN

- ✅ Archivos nuevos creados y funcionales
- ✅ Diffs propuestos (no implementados)
- ✅ Cambios mínimos, quirúrgicos
- ✅ Backward compatible (Dialog wrapper intacto)
- ✅ Visual 100% igual a hoy