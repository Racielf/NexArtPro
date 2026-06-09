import React from 'react';
import CompanyLogoBlock from './CompanyLogoBlock';

/**
 * FlexibleDocHeader — Layout-driven document header.
 *
 * Renders logo + company info + document meta in different structural arrangements
 * based on `layout.header` and `layout.logoPosition`.
 *
 * Props:
 *   layout     — from getTemplateLayout()
 *   company    — { name, tagline, address, email, phone, logoUrl }
 *   meta       — { documentTypeLabel, documentNumber, today, expirationDate, status, statusLabel, statusStyle }
 */
export default function FlexibleDocHeader({ layout, company, meta }) {
  const { header, logoPosition, headerBg, headerColor, accentColor, font } = layout;

  // ── Shared sub-blocks ──────────────────────────────

  const LogoBlock = ({ size = 48 }) => (
    <CompanyLogoBlock
      logoUrl={company.logoUrl}
      size={size}
      borderColor={accentColor}
      bgColor={headerBg === '#ffffff' ? '#f1f5f9' : headerBg}
    />
  );

  const CompanyBlock = ({ color = headerColor, small = false }) => (
    <div>
      <div style={{ fontWeight: 800, fontSize: small ? 16 : 20, color, letterSpacing: '-0.3px', lineHeight: 1.15 }}>
        {company.name}
      </div>
      {company.tagline && (
        <div style={{ fontSize: small ? 10 : 11, color: headerBg === '#ffffff' ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
          {company.tagline}
        </div>
      )}
      <div style={{ fontSize: small ? 10 : 11, color: headerBg === '#ffffff' ? '#6b7280' : '#94a3b8', lineHeight: 1.7, marginTop: 4 }}>
        {company.address && <div>{company.address}</div>}
        <div>{[company.email, company.phone].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  );

  const DocInfoBlock = ({ align = 'right', color = headerColor }) => (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: headerBg === '#ffffff' ? '#6b7280' : '#94a3b8', marginBottom: 4 }}>
        {meta.documentTypeLabel}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-1px', lineHeight: 1 }}>
        #{meta.documentNumber || '—'}
      </div>
      <div style={{ fontSize: 11, color: headerBg === '#ffffff' ? '#6b7280' : '#94a3b8', marginTop: 8 }}>
        {meta.today}
      </div>
      {meta.expirationDate && (
        <div style={{ fontSize: 11, color: headerBg === '#ffffff' ? '#9ca3af' : '#64748b', marginTop: 2 }}>
          Expires: {meta.expirationDate}
        </div>
      )}
      {meta.status && meta.status !== 'draft' && (
        <div style={{
          display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 4,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          background: meta.statusStyle?.bg || '#e2e8f0',
          color: meta.statusStyle?.color || '#334155',
        }}>
          {meta.statusLabel || meta.status}
        </div>
      )}
    </div>
  );

  // ── Layout: left-right ─────────────────────────────
  if (header === 'left-right') {
    return (
      <div style={{
        fontFamily: font,
        background: headerBg,
        padding: '32px 44px 28px',
        color: headerColor,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <LogoBlock size={48} />
            <CompanyBlock />
          </div>
          <DocInfoBlock />
        </div>
      </div>
    );
  }

  // ── Layout: stacked ────────────────────────────────
  if (header === 'stacked') {
    return (
      <div style={{
        fontFamily: font,
        background: headerBg,
        padding: '36px 44px 28px',
        color: headerColor,
        borderBottom: `4px solid ${accentColor}`,
      }}>
        {/* Logo centered or left based on logoPosition */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: logoPosition === 'top' ? 'center' : 'flex-start',
          marginBottom: 20,
        }}>
          <LogoBlock size={56} />
          <div style={{ marginTop: 12, textAlign: logoPosition === 'top' ? 'center' : 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: headerColor, letterSpacing: '-0.3px' }}>{company.name}</div>
            {company.tagline && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{company.tagline}</div>}
          </div>
        </div>
        {/* Doc info below, left-aligned */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
            {company.address && <div>{company.address}</div>}
            <div>{[company.email, company.phone].filter(Boolean).join(' · ')}</div>
          </div>
          <DocInfoBlock align="right" />
        </div>
      </div>
    );
  }

  // ── Layout: split-premium ──────────────────────────
  if (header === 'split-premium') {
    return (
      <div style={{
        fontFamily: font,
        background: headerBg,
        padding: '40px 44px 32px',
        color: headerColor,
        borderBottom: `2px solid ${accentColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <LogoBlock size={52} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 'bold', color: headerColor, marginBottom: 4, letterSpacing: '-0.3px' }}>{company.name}</div>
              {company.tagline && <div style={{ fontSize: 11, color: '#7a7a7a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{company.tagline}</div>}
              <div style={{ fontSize: 11, color: '#7a7a7a', lineHeight: 1.8 }}>
                {company.address && <div>{company.address}</div>}
                <div>{[company.email, company.phone].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          </div>
          {/* Accent divider + doc info */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 20 }}>
            <div style={{ width: 2, background: accentColor, borderRadius: 1, alignSelf: 'stretch' }} />
            <DocInfoBlock color={headerColor} />
          </div>
        </div>
      </div>
    );
  }

  // Fallback → left-right
  return (
    <div style={{ fontFamily: font, background: headerBg, padding: '32px 44px', color: headerColor }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <LogoBlock size={48} />
          <CompanyBlock />
        </div>
        <DocInfoBlock />
      </div>
    </div>
  );
}