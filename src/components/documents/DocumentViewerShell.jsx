import React from 'react';
import GlobalDocumentCloseButton from '@/components/ui/GlobalDocumentCloseButton';

/**
 * DocumentViewerShell — Shell unificado para visualizar documentos.
 * Layout interno SIEMPRE igual.
 * X en posición absoluta, no empuja contenido.
 *
 * Props:
 * - documentContent: ReactNode (documento renderizado)
 * - title: string (título en toolbar)
 * - actions: ReactNode[] (botones adicionales en toolbar)
 * - onClose: () => void (handler para cerrar)
 */
export default function DocumentViewerShell({
  documentContent,
  title,
  actions = [],
  onClose,
}) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>

      {/* Document Container */}
      <div className="flex-1 overflow-y-auto bg-slate-200 p-6 min-h-0 flex justify-center">
        <div className="w-full max-w-4xl">
          {documentContent}
        </div>
      </div>

      {/* Close Button — Absolute, no empuja contenido */}
      <GlobalDocumentCloseButton onClick={onClose} />
    </div>
  );
}