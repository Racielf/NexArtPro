import React from 'react';
import { X } from 'lucide-react';

/**
 * DocumentCloseButton — Botón de cierre global para modales y documentos.
 * 
 * Características:
 * - X muy tenue en reposo
 * - Resalta en rojo al pasar el mouse
 * - Feedback visual claro en click
 * - Componente puro (lógica de cierre viene del padre)
 * 
 * Uso:
 * <DocumentCloseButton onClick={handleClose} />
 */
export default function DocumentCloseButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center p-3 rounded-lg 
        bg-transparent text-slate-500
        hover:bg-red-50 hover:text-red-600
        active:bg-red-100 active:text-red-700
        transition-all duration-150
        ring-offset-background focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        disabled:pointer-events-none disabled:opacity-40
        ${className}`}
      title="Close document"
      aria-label="Close document"
    >
      <X className="h-6 w-6 stroke-[2.5]" />
    </button>
  );
}