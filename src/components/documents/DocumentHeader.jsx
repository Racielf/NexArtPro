import React from 'react';

/**
 * DocumentHeader — Encabezado de documento reutilizable
 * 
 * Responsabilidad: Renderizar info del documento (logo, empresa, título, número, fecha)
 * Flexibilidad: Layout visual varia por template (padding, font, colores, etc.)
 * 
 * Props:
 *   estimate (object) - Datos del documento
 *   documentType (string) - 'estimate' | 'invoice' | 'workorder'
 *   today (string) - Fecha formateada (hoy)
 *   expDate (string|null) - Fecha de expiración formateada (opcional)
 *   statusStyle (object) - { bg, color } para badge de status
 *   showStatus (boolean) - Mostrar status badge (default: true)
 *   variant (string) - 'minimal' | 'standard' | 'modern' | 'executive' | 'compact' | 'pro'
 *   style (object) - Estilos CSS custom
 *   className (string) - Classes custom
 */
export default function DocumentHeader({
  estimate,
  documentType = 'estimate',
  today,
  expDate = null,
  statusStyle = {},
  showStatus = true,
  variant = 'standard',
  style = {},
  className = '',
}) {
  if (!estimate) return null;

  const docTypeLabel = {
    estimate: 'ESTIMATE',
    invoice: 'INVOICE',
    workorder: 'WORK ORDER',
  }[documentType] || 'DOCUMENT';

  // Template-specific default styles (puede ser overridden por prop style)
  const variantDefaults = {
    minimal: {
      titleFontSize: 24,
      numberFontSize: 14,
      padding: 30,
    },
    standard: {
      titleFontSize: 20,
      numberFontSize: 32,
      padding: 36,
      headerBg: '#0f172a',
      headerColor: 'white',
    },
    modern: {
      titleFontSize: 32,
      numberFontSize: 14,
      padding: 30,
      accentColor: '#7c3aed',
    },
    executive: {
      titleFontSize: 28,
      numberFontSize: 24,
      padding: 40,
    },
    compact: {
      titleFontSize: 16,
      numberFontSize: 20,
      padding: 20,
    },
    pro: {
      titleFontSize: 24,
      numberFontSize: 36,
      padding: 40,
      headerBg: '#0f172a',
      headerColor: 'white',
    },
  };

  const defaults = variantDefaults[variant] || variantDefaults.standard;

  return (
    <div
      className={className}
      style={{
        ...defaults,
        ...style,
      }}
    >
      {/* Placeholder: Template-specific layout handled by parent */}
      {/* Este componente es agnóstico al layout — el padre decide cómo distribuir elementos */}
      
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: defaults.titleFontSize, fontWeight: 'bold' }}>
          {docTypeLabel}
        </div>
      </div>

      <div style={{ fontSize: defaults.numberFontSize, fontWeight: 'bold', marginBottom: 8 }}>
        #{estimate.estimate_number || estimate.invoice_number || estimate.work_order_number || '—'}
      </div>

      {today && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          {today}
        </div>
      )}

      {expDate && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          Expires: {expDate}
        </div>
      )}

      {showStatus && estimate.status && (
        <div
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '3px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            background: statusStyle.bg || '#ccc',
            color: statusStyle.color || '#000',
          }}
        >
          {estimate.status}
        </div>
      )}
    </div>
  );
}