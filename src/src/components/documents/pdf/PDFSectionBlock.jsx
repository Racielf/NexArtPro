import React from 'react';
import { COLORS, FONT, SPACE, S } from './PDFStyles';

/**
 * PDFSectionBlock — Consistent section wrapper with title + optional subtitle.
 * Handles spacing, typography, and bilingual title rendering.
 */
export default function PDFSectionBlock({ title, titleEs, children, accent, spacing = 'normal', noBorder = false, style = {} }) {
  const gap = spacing === 'tight' ? SPACE.xl : spacing === 'loose' ? SPACE['3xl'] : SPACE.sectionGap;
  const titleColor = accent || COLORS.text.muted;

  return (
    <div style={{ marginBottom: gap, ...style }}>
      {title && (
        <div style={{
          fontSize: FONT.size.xs,
          fontWeight: FONT.weight.bold,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: titleColor,
          marginBottom: SPACE.md,
          lineHeight: titleEs ? FONT.lineHeight.normal : FONT.lineHeight.tight,
          ...(noBorder ? {} : { paddingBottom: SPACE.sm, borderBottom: `1px solid ${COLORS.border.light}` }),
        }}>
          {title}
          {titleEs && (
            <span style={{ display: 'block', fontSize: FONT.size.tiny, color: COLORS.text.faint, fontWeight: FONT.weight.semibold, marginTop: 2, fontStyle: 'italic' }}>
              {titleEs}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}