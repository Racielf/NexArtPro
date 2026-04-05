import React from 'react';
import GlobalDocumentCloseButton from './GlobalDocumentCloseButton';

/**
 * DocumentViewerShell — Shell unificado para visualizar documentos.
 * 
 * Props:
 * - documentContent: ReactNode (el documento renderizado)
 * - title: string (título en toolbar)
 * - actions: ReactNode[] (botones adicionales en toolbar)
 * - onClose: () => void (handler para cerrar)
 * - mode: 'modal' | 'fullscreen' | 'client' (layout y comportamiento)
 * 
 * Estructura:
 * ┌─ Toolbar (si no fullscreen): título + acciones + X
 * ├─ Document scroll container: documento
 * └─ Estilos responsivos por modo
 */
export default function DocumentViewerShell({
  documentContent,
  title,
  actions = [],
  onClose,
  mode = 'modal'
}) {
  // Configuración por modo
  const config = {
    modal: {
      containerClass: 'fixed inset-0 flex flex-col bg-white',
      toolbarClass: 'flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0',
      titleClass: 'text-sm font-semibold text-slate-700',
      scrollClass: 'flex-1 overflow-y-auto bg-slate-200 p-6 min-h-0 flex justify-center',
      docWrapperClass: 'w-full max-w-4xl',
      showToolbar: true,
    },
    fullscreen: {
      containerClass: 'fixed inset-0 flex flex-col bg-white',
      toolbarClass: 'flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0 shadow-sm',
      titleClass: 'text-sm font-bold text-slate-800',
      scrollClass: 'flex-1 overflow-auto p-8 bg-slate-50 min-h-0 flex justify-center',
      docWrapperClass: 'w-full max-w-3xl',
      showToolbar: true,
    },
    client: {
      containerClass: 'min-h-screen bg-slate-50 py-8 px-4',
      toolbarClass: 'hidden',
      titleClass: '',
      scrollClass: 'max-w-2xl mx-auto space-y-4',
      docWrapperClass: 'bg-white rounded-2xl shadow-lg overflow-hidden',
      showToolbar: false,
    },
  };

  const c = config[mode] || config.modal;

  return (
    <div className={c.containerClass}>
      {/* TOOLBAR */}
      {c.showToolbar && (
        <div className={c.toolbarClass}>
          <span className={c.titleClass}>{title}</span>
          <div className="flex items-center gap-3">
            {actions}
            <GlobalDocumentCloseButton onClick={onClose} />
          </div>
        </div>
      )}

      {/* DOCUMENT CONTAINER */}
      <div className={c.scrollClass}>
        <div className={c.docWrapperClass}>
          {documentContent}
        </div>
      </div>
    </div>
  );
}