import React from 'react';
import { X } from 'lucide-react';

/**
 * GlobalDocumentCloseButton — Botón X reusable para todos los viewers documentales.
 * 
 * Visual:
 * - Reposo: caja casi invisible, tenue
 * - Hover: fondo rojo, texto rojo, visible
 * - Click: más oscuro, feedback visual
 * 
 * Usable en:
 * - Modal headers
 * - Fullscreen toolbars
 * - Cualquier documento
 */
export default function GlobalDocumentCloseButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center p-2.5 rounded-lg 
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