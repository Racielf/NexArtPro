import React from 'react';

/**
 * FlexibleDocDates — Layout-driven date display.
 *
 * Rules:
 *   - Document date always shown
 *   - Start date shown if present
 *   - End date shown if present
 *
 * Modes (from layout.dates):
 *   "block"   — stacked label/value pairs
 *   "inline"  — single line with separators
 *   "formal"  — mini table rows (label: value)
 *
 * Props:
 *   mode       — 'block' | 'inline' | 'formal'
 *   docDate    — formatted string (always shown)
 *   startDate  — formatted string or null
 *   endDate    — formatted string or null
 *   accentColor — template accent color
 *   font       — font family
 */
export default function FlexibleDocDates({ mode = 'block', docDate, startDate, endDate, accentColor = '#3b82f6', font }) {
  const items = [
    { label: 'Date', value: docDate },
    ...(startDate ? [{ label: 'Start', value: startDate }] : []),
    ...(endDate ? [{ label: 'Completion', value: endDate }] : []),
  ].filter(i => i.value);

  if (items.length === 0) return null;

  // ── Block mode: stacked ────────────────────────────
  if (mode === 'block') {
    return (
      <div style={{ fontFamily: font }}>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: i < items.length - 1 ? 8 : 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 2 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Inline mode: single row ────────────────────────
  if (mode === 'inline') {
    return (
      <div style={{ fontFamily: font, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 11, color: '#6b7280' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>{item.label}:</span>{' '}
            {item.value}
            {i < items.length - 1 && <span style={{ margin: '0 4px', color: '#d1d5db' }}>·</span>}
          </span>
        ))}
      </div>
    );
  }

  // ── Formal mode: mini table ────────────────────────
  if (mode === 'formal') {
    return (
      <div style={{ fontFamily: font }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0',
            borderBottom: i < items.length - 1 ? '1px solid #e5e7eb' : 'none',
            fontSize: 12,
          }}>
            <span style={{ color: '#6b7280' }}>{item.label}</span>
            <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback → block
  return (
    <div style={{ fontFamily: font }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  );
}