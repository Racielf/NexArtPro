import React from 'react';

/**
 * DocumentHeader — Reusable document header (Phase 11: fully vm-driven)
 *
 * Props (all explicit — no raw estimate object):
 *   documentNumber (string|number) - Display number (#EST-001, etc.)
 *   documentTypeLabel (string) - 'ESTIMATE' | 'INVOICE' | 'WORK ORDER'
 *   status (string|null) - Status key for badge display
 *   statusLabel (string|null) - Human-readable status text
 *   statusStyle (object) - { bg, color } for badge
 *   today (string|null) - Formatted date
 *   expDate (string|null) - Formatted expiration date
 *   showStatus (boolean) - Show status badge (default: true)
 *   variant (string) - 'minimal' | 'standard' | 'modern' | 'executive' | 'compact' | 'pro'
 *   style (object) - Custom CSS styles
 *   className (string) - Custom classes
 */
export default function DocumentHeader({
  documentNumber,
  documentTypeLabel = 'DOCUMENT',
  status = null,
  statusLabel = null,
  statusStyle = {},
  today = null,
  expDate = null,
  showStatus = true,
  variant = 'standard',
  style = {},
  className = '',
}) {
  const variantDefaults = {
    minimal: { titleFontSize: 24, numberFontSize: 14, padding: 30 },
    standard: { titleFontSize: 20, numberFontSize: 32, padding: 36, headerBg: '#0f172a', headerColor: 'white' },
    modern: { titleFontSize: 32, numberFontSize: 14, padding: 30, accentColor: '#7c3aed' },
    executive: { titleFontSize: 28, numberFontSize: 24, padding: 40 },
    compact: { titleFontSize: 16, numberFontSize: 20, padding: 20 },
    pro: { titleFontSize: 24, numberFontSize: 36, padding: 40, headerBg: '#0f172a', headerColor: 'white' },
  };

  const defaults = variantDefaults[variant] || variantDefaults.standard;

  return (
    <div className={className} style={{ ...defaults, ...style }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: defaults.titleFontSize, fontWeight: 'bold' }}>
          {documentTypeLabel}
        </div>
      </div>

      <div style={{ fontSize: defaults.numberFontSize, fontWeight: 'bold', marginBottom: 8 }}>
        #{documentNumber || '—'}
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

      {showStatus && status && (
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
          {statusLabel || status}
        </div>
      )}
    </div>
  );
}