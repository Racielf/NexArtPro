import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { COLORS, FONT, SPACE } from './PDFStyles';
import CompanyLogoBlock from '@/components/documents/CompanyLogoBlock';

/**
 * PDFHeader — Shared document header.
 * Renders differently for PROPOSAL (white bg, accent border) vs BID (dark bg).
 */
export default function PDFHeader({ docLabel, number, date, expDate, variant = 'proposal', accent, logoUrl }) {
  const isBid = variant === 'bid';
  const accentColor = accent || (isBid ? COLORS.bid.accentBlue : COLORS.proposal.accent);

  if (isBid) {
    return (
      <div style={{ background: COLORS.bid.headerBg, padding: `${SPACE['3xl']}px ${SPACE.page}px ${SPACE['2xl']}px`, color: COLORS.text.inverse }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <CompanyLogoBlock logoUrl={logoUrl} size={44} borderColor={accentColor} bgColor="#1e293b" />
              <div>
                <div style={{ fontWeight: FONT.weight.extrabold, fontSize: FONT.size['2xl'], letterSpacing: '-0.3px' }}>{appConfig.company.name}</div>
                <div style={{ color: COLORS.text.muted, fontSize: FONT.size.xs }}>{appConfig.company.tagline}</div>
              </div>
            </div>
            <div style={{ color: COLORS.text.muted, fontSize: FONT.size.sm, lineHeight: FONT.lineHeight.loose }}>
              {appConfig.company.address && <>{appConfig.company.address}<br /></>}
              {appConfig.company.email}{appConfig.company.phone ? ` · ${appConfig.company.phone}` : ''}
            </div>
          </div>
          {/* Document info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, textTransform: 'uppercase', letterSpacing: '0.15em', color: COLORS.text.faint, marginBottom: 4 }}>{docLabel}</div>
            <div style={{ fontSize: FONT.size['4xl'], fontWeight: FONT.weight.black, color: COLORS.text.inverse, lineHeight: 1 }}>#{number || '—'}</div>
            <div style={{ fontSize: FONT.size.sm, color: COLORS.text.faint, marginTop: 8 }}>{date}</div>
            {expDate && <div style={{ fontSize: FONT.size.sm, color: COLORS.text.muted, marginTop: 2 }}>Valid Until: {expDate}</div>}
          </div>
        </div>
      </div>
    );
  }

  // PROPOSAL — White background, accent bottom border
  return (
    <div style={{ padding: `${SPACE.pageTop}px ${SPACE.page}px ${SPACE['2xl']}px`, borderBottom: `4px solid ${accentColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            {logoUrl && <CompanyLogoBlock logoUrl={logoUrl} size={48} borderColor={accentColor} bgColor="#f8fafc" />}
            <div style={{ fontSize: FONT.size['5xl'], fontWeight: FONT.weight.extrabold, color: COLORS.text.primary, letterSpacing: '-0.5px' }}>{appConfig.company.name}</div>
          </div>
          <div style={{ fontSize: FONT.size.sm, color: COLORS.text.muted, marginBottom: SPACE.lg }}>
            {appConfig.company.tagline}
          </div>
          <div style={{ fontSize: FONT.size.sm, color: COLORS.text.faint, lineHeight: FONT.lineHeight.loose }}>
            {appConfig.company.address && <>{appConfig.company.address}<br /></>}
            {appConfig.company.email}{appConfig.company.phone ? ` · ${appConfig.company.phone}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, textTransform: 'uppercase', letterSpacing: '0.15em', color: accentColor, marginBottom: 4 }}>{docLabel}</div>
          <div style={{ fontSize: FONT.size['5xl'], fontWeight: FONT.weight.black, color: COLORS.text.primary, lineHeight: 1 }}>#{number || '—'}</div>
          <div style={{ fontSize: FONT.size.sm, color: COLORS.text.faint, marginTop: SPACE.sm }}>{date}</div>
          {expDate && <div style={{ fontSize: FONT.size.sm, color: COLORS.text.faint, marginTop: 2 }}>Valid Until: {expDate}</div>}
        </div>
      </div>
    </div>
  );
}