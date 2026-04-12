import React from 'react';

/**
 * FlexibleDocDates — Explicit visibility-driven date display.
 *
 * Date visibility rules:
 *   - Each date has an independent show flag
 *   - Fallback: if no project dates are shown, document date appears (if enabled)
 *   - If only start is shown, show start only
 *   - If both start + end are shown, show both
 *   - Document date shown when enabled AND (always, or when no project dates visible)
 *
 * Modes (visual layout only):
 *   "block"   — stacked label/value pairs
 *   "inline"  — single line with separators
 *   "formal"  — mini table rows (label: value)
 *
 * Props:
 *   mode              — 'block' | 'inline' | 'formal'
 *   docDate           — formatted string
 *   startDate         — formatted string or null
 *   endDate           — formatted string or null
 *   showDocumentDate  — boolean (default true)
 *   showStartDate     — boolean (default true)
 *   showEndDate       — boolean (default true)
 *   accentColor       — template accent color
 *   font              — font family
 */
export default function FlexibleDocDates({
  mode = 'block',
  docDate,
  startDate,
  endDate,
  showDocumentDate = true,
  showStartDate = true,
  showEndDate = true,
  accentColor = '#3b82f6',
  font,
}) {
  // Build visible items based on explicit flags
  const items = [];

  const startVisible = showStartDate && startDate;
  const endVisible = showEndDate && endDate;
  const anyProjectDateVisible = startVisible || endVisible;

  // Document date: show if enabled AND (no project dates visible OR always-show mode)
  // Fallback: if project dates are all hidden, always show doc date when enabled
  if (showDocumentDate && docDate && !anyProjectDateVisible) {
    items.push({ label: 'Date', value: docDate });
  } else if (showDocumentDate && docDate && anyProjectDateVisible) {
    // When project dates are visible, still show document date as context
    items.push({ label: 'Date', value: docDate });
  }

  if (startVisible) items.push({ label: 'Start', value: startDate });
  if (endVisible) items.push({ label: 'Completion', value: endDate });

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

  // Fallback → simple list
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