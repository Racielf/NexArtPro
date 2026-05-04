import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function NexArtSignBrandHeader({
  companyLogoUrl = '',
  companyName = '',
  nexArtSignLogoUrl = '',
  status = '',
}) {
  const statusConfig = {
    viewed: { label: 'Viewed', bg: '#dbeafe', color: '#1e40af' },
    verified: { label: 'Verified', bg: '#d1fae5', color: '#065f46' },
    signed: { label: 'Signed', bg: '#d1fae5', color: '#065f46' },
    declined: { label: 'Declined', bg: '#fee2e2', color: '#991b1b' },
    expired: { label: 'Expired', bg: '#fef3c7', color: '#92400e' },
  };

  const badge = statusConfig[status];

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* NexArtSign Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {nexArtSignLogoUrl ? (
            <img
              src={nexArtSignLogoUrl}
              alt="NexArtSign"
              style={{ height: '44px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck style={{ width: '22px', height: '22px', color: '#ffffff' }} />
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  NexArtSign<span style={{ fontSize: '10px', verticalAlign: 'super', color: '#64748b' }}>™</span>
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, lineHeight: 1.2 }}>
                  Secure Electronic Signature
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Divider + Company Logo */}
        {companyLogoUrl && (
          <>
            <div style={{ width: '1px', height: '40px', background: '#e2e8f0' }} />
            <img
              src={companyLogoUrl}
              alt={companyName || 'Company'}
              style={{ height: '48px', objectFit: 'contain' }}
            />
          </>
        )}
        {!companyLogoUrl && companyName && (
          <>
            <div style={{ width: '1px', height: '40px', background: '#e2e8f0' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>{companyName}</p>
          </>
        )}
      </div>

      {/* Status Badge */}
      {badge && (
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: badge.bg,
            color: badge.color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {badge.label}
        </div>
      )}
    </header>
  );
}
