import React from 'react';
import { X } from 'lucide-react';

/**
 * GlobalDocumentCloseButton — Botón X global para documentos.
 * Posición absoluta, no empuja contenido.
 * Mismo estilo en todas las superficies.
 */
export default function GlobalDocumentCloseButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-6 right-6 inline-flex items-center justify-center p-2.5 rounded-lg 
        bg-transparent text-slate-400 opacity-60
        hover:bg-red-50 hover:text-red-600 hover:opacity-100
        active:bg-red-100 active:text-red-700
        transition-all duration-150
        ring-offset-background focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        disabled:pointer-events-none disabled:opacity-40
        ${className}`}
      title="Close"
      aria-label="Close document"
    >
      <X className="h-5 w-5" />
    </button>
  );
}