import React from 'react';
import { COLORS, FONT, SPACE, S } from './PDFStyles';

/**
 * PDFInfoGrid — Two-column client + project info layout.
 * Used in both Proposal and Bid headers.
 */

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 5, fontSize: FONT.size.base }}>
      <span style={{ color: COLORS.text.faint, fontWeight: FONT.weight.semibold, minWidth: 110 }}>{label}</span>
      <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{value}</span>
    </div>
  );
}

export default function PDFInfoGrid({ leftTitle, leftContent, rightTitle, rightContent, variant = 'proposal' }) {
  const isBid = variant === 'bid';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: SPACE['3xl'],
      ...(isBid ? { padding: `${SPACE['2xl']}px ${SPACE.page}px`, borderBottom: `1px solid ${COLORS.border.medium}` } : { paddingTop: SPACE['2xl'] }),
    }}>
      {/* Left Column */}
      <div>
        <div style={S.tinyLabel}>{leftTitle}</div>
        {leftContent}
      </div>
      {/* Right Column */}
      <div>
        <div style={S.tinyLabel}>{rightTitle}</div>
        {rightContent}
      </div>
    </div>
  );
}

export { InfoRow };