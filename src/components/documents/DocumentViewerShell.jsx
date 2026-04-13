import React from 'react';
import GlobalDocumentCloseButton from '@/components/ui/GlobalDocumentCloseButton';

/**
 * DocumentViewerShell — Shell unificado para visualizar documentos.
 *
 * Modos:
 * - Simple (Fase 1): toolbar + document area + close button
 * - Split  (Fase 2): optional banners + toolbar + side panel + document area + close button
 *
 * Props:
 * - documentContent: ReactNode (documento renderizado)
 * - title: string | ReactNode (título en toolbar)
 * - actions: ReactNode[] (botones adicionales en toolbar)
 * - onClose: () => void (opcional)
 * - banners: ReactNode (optional — rendered above toolbar)
 * - sidePanel: ReactNode (optional — left panel for split layout)
 * - footer: ReactNode (optional — rendered below document, inside scroll area)
 * - variant: 'simple' | 'fullscreen' (default: 'simple')
 */
export default function DocumentViewerShell({
  documentContent,
  title,
  actions = [],
  onClose,
  banners,
  sidePanel,
  footer,
  variant = 'simple',
}) {
  const isFullscreen = variant === 'fullscreen';
  const outerClass = isFullscreen
    ? 'fixed inset-0 z-[60] bg-[#f0f2f5] flex flex-col overflow-hidden'
    : 'relative w-full h-full flex flex-col overflow-hidden';

  return (
    <div className={outerClass}>
      {/* Optional banners — above toolbar */}
      {banners}

      {/* Toolbar */}
      <div className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${
        isFullscreen ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200'
      }`}>
        {typeof title === 'string' ? (
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        ) : title}
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>

      {/* Content area — split or simple */}
      {sidePanel ? (
        <div className="flex flex-1 overflow-hidden min-h-0">
          {sidePanel}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center min-h-0">
            <div className="w-full max-w-3xl space-y-4">
              {documentContent}
              {footer}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6 min-h-0 flex justify-center">
          <div className="w-full max-w-4xl space-y-4">
            {documentContent}
            {footer}
          </div>
        </div>
      )}

      {/* Close Button — Absolute, solo si onClose está definido y no es fullscreen */}
      {!isFullscreen && onClose && <GlobalDocumentCloseButton onClick={onClose} />}
    </div>
  );
}