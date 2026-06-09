import React from 'react';
import { X } from 'lucide-react';

/**
 * DocumentCloseButton — Botón de cierre reutilizable para documentos
 * 
 * Responsabilidad: Botón X consistente para modales/documentos
 * Variante específica de documentos (no duplica ../shared/DocumentCloseButton)
 * 
 * Props:
 *   onClick (function) - Handler al hacer click (opcional)
 *   className (string) - Classes custom
 *   style (object) - Estilos custom
 *   ariaLabel (string) - Label de accesibilidad (default: "Close document")
 *   title (string) - Tooltip (default: "Close document")
 */
export default function DocumentCloseButton({
  onClick,
  className = '',
  style = {},
  ariaLabel = 'Close document',
  title = 'Close document',
}) {
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
      title={title}
      aria-label={ariaLabel}
      style={style}
    >
      <X className="h-6 w-6 stroke-[2.5]" />
    </button>
  );
}