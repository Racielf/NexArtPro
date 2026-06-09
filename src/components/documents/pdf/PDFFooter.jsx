import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { COLORS, FONT, SPACE } from './PDFStyles';

/**
 * PDFFooter — Consistent document footer with company details.
 */
export default function PDFFooter({ date, accent, variant = 'proposal' }) {
  const borderColor = variant === 'bid' ? COLORS.border.medium : accent || COLORS.proposal.accent;

  return (
    <div style={{
      textAlign: 'center',
      padding: `${SPACE.lg}px ${SPACE.page}px`,
      borderTop: `${variant === 'proposal' ? 2 : 1}px solid ${borderColor}`,
      marginTop: SPACE.sm,
    }}>
      <div style={{ fontSize: FONT.size.tiny - 1, color: COLORS.text.faint, letterSpacing: '0.06em' }}>
        {appConfig.company.name}
        {appConfig.company.address ? ` · ${appConfig.company.address}` : ''}
        {appConfig.company.license ? ` · License ${appConfig.company.license}` : ''}
        {date ? ` · ${date}` : ''}
      </div>
    </div>
  );
}