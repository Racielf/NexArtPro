import React from 'react';

/**
 * CompanyLogoBlock — Renders company logo for document templates.
 * Falls back to an SVG icon if no logo URL is set.
 * 
 * Props:
 *   logoUrl (string) — URL of uploaded logo
 *   size (number) — width/height of container (default 48)
 *   borderColor (string) — border color (default #38bdf8)
 *   bgColor (string) — background color (default #1e293b)
 *   style (object) — extra styles
 */
export default function CompanyLogoBlock({
  logoUrl,
  size = 96,
  borderColor = '#38bdf8',
  bgColor = '#1e293b',
  style = {},
}) {
  if (logoUrl) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        border: `2px solid ${borderColor}`,
        ...style,
      }}>
        <img
          src={logoUrl}
          alt="Company logo"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  // Fallback SVG icon
  return (
    <div style={{
      width: size,
      height: size,
      background: bgColor,
      borderRadius: size * 0.2,
      border: `2px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}>
      <svg viewBox="0 0 40 40" width={size * 0.58} height={size * 0.58} fill="none">
        <path d="M8 28L20 12L32 28" stroke={borderColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}