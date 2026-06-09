import React from 'react';
import { COLORS, FONT, SPACE } from './PDFStyles';

/**
 * PDFSignatureBlock — Dual signature lines for document acceptance.
 * Adapts styling for Proposal (accent border) vs Bid (dark border).
 */
export default function PDFSignatureBlock({ signatures = [], accent = COLORS.bid.accent, variant = 'proposal', dateLabel = 'Date' }) {
  const lineColor = variant === 'bid' ? COLORS.bid.accent : accent;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE['5xl'], marginTop: SPACE.sm }}>
      {signatures.map((sig, i) => (
        <div key={i}>
          {/* Signature line */}
          <div style={{ height: 48, borderBottom: `2px solid ${lineColor}`, marginBottom: SPACE.sm }} />
          <div style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>{sig.title}</div>
          <div style={{ fontSize: FONT.size.xs, color: COLORS.text.faint, marginTop: 2 }}>{sig.sub}</div>
          {sig.extra && <div style={{ fontSize: FONT.size.tiny, color: COLORS.text.faint, marginTop: 1 }}>{sig.extra}</div>}
          {/* Date line */}
          <div style={{ marginTop: SPACE.lg, height: 24, borderBottom: `1px solid ${COLORS.border.heavy}` }} />
          <div style={{ fontSize: FONT.size.xs, color: COLORS.text.faint, marginTop: 4 }}>{dateLabel}</div>
        </div>
      ))}
    </div>
  );
}