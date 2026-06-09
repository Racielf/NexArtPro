import React from 'react';

/**
 * ProposalSections — Shared proposal enhancement sections for all estimate templates.
 * Renders: What's Included, Exclusions, Warranty, Estimated Timeline, Client Acceptance.
 * Each section is a standalone export for flexible placement in templates.
 *
 * NEVER exposes internal pricing data (cost, margin, book_price).
 */

// ─── What's Included ───────────────────────────────────────────────────────
// Only renders when explicit bullet data is passed via the `bullets` prop.
// Does NOT auto-generate content from line items.
export function WhatsIncludedSection({ bullets = [], font, dark, muted, border, sectionLabelStyle }) {
  if (bullets.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>What's Included</div>
      <ul style={{
        margin: 0, paddingLeft: 20, listStyleType: 'disc',
        fontFamily: font, fontSize: 12, color: dark || '#334155',
        lineHeight: 1.85,
      }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 3 }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Exclusions ────────────────────────────────────────────────────────────
export function ExclusionsSection({ exclusions, font, muted, sectionLabelStyle }) {
  if (!exclusions) return null;

  // Split by newlines or periods for bullet format
  const items = exclusions
    .split(/[\n•]/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Exclusions</div>
      {items.length > 1 ? (
        <ul style={{
          margin: 0, paddingLeft: 20, listStyleType: 'disc',
          fontFamily: font, fontSize: 12, color: muted || '#64748b',
          lineHeight: 1.85,
        }}>
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ fontFamily: font, fontSize: 12, color: muted || '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
          {exclusions}
        </p>
      )}
    </div>
  );
}

// ─── Warranty ──────────────────────────────────────────────────────────────
// Only renders when warrantyTerms is provided. No fallback content.
export function WarrantySection({ warrantyTerms, font, muted, sectionLabelStyle, accentColor }) {
  if (!warrantyTerms) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Warranty</div>
      <div style={{
        padding: '14px 18px', borderRadius: 6,
        background: accentColor ? `${accentColor}08` : '#f8fafc',
        border: `1px solid ${accentColor ? `${accentColor}20` : '#e2e8f0'}`,
      }}>
        <p style={{ fontFamily: font, fontSize: 12, color: muted || '#475569', lineHeight: 1.7, margin: 0 }}>
          {warrantyTerms}
        </p>
      </div>
    </div>
  );
}

// ─── Estimated Timeline ────────────────────────────────────────────────────
export function TimelineSection({ startDate, endDate, font, dark, muted, border, sectionLabelStyle }) {
  if (!startDate && !endDate) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Estimated Timeline</div>
      <div style={{ display: 'flex', gap: 16 }}>
        {startDate && (
          <div style={{
            flex: 1, padding: '14px 18px', borderRadius: 6,
            background: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted || '#94a3b8', marginBottom: 6 }}>
              Estimated Start
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: dark || '#0f172a' }}>{startDate}</div>
          </div>
        )}
        {endDate && (
          <div style={{
            flex: 1, padding: '14px 18px', borderRadius: 6,
            background: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted || '#94a3b8', marginBottom: 6 }}>
              Estimated Completion
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: dark || '#0f172a' }}>{endDate}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payment Terms (bullet format) ─────────────────────────────────────────
export function PaymentTermsBullets({ paymentTerms, depositPercent, depositAmount, total, font, muted, sectionLabelStyle }) {
  const bullets = [];

  if (depositPercent > 0 && depositAmount > 0) {
    bullets.push(`${depositPercent}% deposit ($${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}) due upon acceptance`);
    const remaining = (total || 0) - depositAmount;
    if (remaining > 0) {
      bullets.push(`Remaining balance of $${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} due upon completion`);
    }
  }

  // Parse additional terms from text
  if (paymentTerms) {
    const lines = paymentTerms.split(/[\n•]/).map(s => s.trim()).filter(Boolean);
    lines.forEach(l => {
      if (!bullets.some(b => b.toLowerCase().includes(l.toLowerCase().slice(0, 20)))) {
        bullets.push(l);
      }
    });
  }

  if (bullets.length === 0) {
    bullets.push('Payment is due upon completion of work');
    bullets.push('We accept check, cash, Zelle, and credit card');
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Payment Terms</div>
      <ul style={{
        margin: 0, paddingLeft: 20, listStyleType: 'disc',
        fontFamily: font, fontSize: 12, color: muted || '#475569',
        lineHeight: 1.85,
      }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 3 }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Scope Summary ─────────────────────────────────────────────────────────
export function ScopeSummarySection({ scopeSummary, font, dark, muted, sectionLabelStyle }) {
  if (!scopeSummary) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Scope Summary</div>
      <p style={{ fontFamily: font, fontSize: 12, color: dark || '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
        {scopeSummary}
      </p>
    </div>
  );
}

// ─── Assumptions ───────────────────────────────────────────────────────────
export function AssumptionsSection({ assumptions, font, muted, sectionLabelStyle }) {
  if (!assumptions) return null;

  const items = assumptions
    .split(/[\n•]/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Assumptions & Conditions</div>
      {items.length > 1 ? (
        <ul style={{
          margin: 0, paddingLeft: 20, listStyleType: 'disc',
          fontFamily: font, fontSize: 12, color: muted || '#64748b',
          lineHeight: 1.85,
        }}>
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ fontFamily: font, fontSize: 12, color: muted || '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
          {assumptions}
        </p>
      )}
    </div>
  );
}

// ─── Change Request Policy ─────────────────────────────────────────────────
export function ChangeRequestSection({ changeRequestPolicy, font, muted, sectionLabelStyle, accentColor }) {
  if (!changeRequestPolicy) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={sectionLabelStyle}>Change Request Policy</div>
      <div style={{
        padding: '14px 18px', borderRadius: 6,
        background: accentColor ? `${accentColor}08` : '#f8fafc',
        border: `1px solid ${accentColor ? `${accentColor}20` : '#e2e8f0'}`,
      }}>
        <p style={{ fontFamily: font, fontSize: 12, color: muted || '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
          {changeRequestPolicy}
        </p>
      </div>
    </div>
  );
}

// ─── Client Acceptance ─────────────────────────────────────────────────────
export function AcceptanceSection({ companyName, clientName, font, dark, muted, border, sectionLabelStyle, accentColor }) {
  return (
    <div>
      <div style={sectionLabelStyle}>Client Acceptance & Authorization</div>

      {/* Approval language */}
      <div style={{
        padding: '16px 20px', borderRadius: 6, marginBottom: 20,
        background: accentColor ? `${accentColor}06` : '#f8fafc',
        border: `1px solid ${accentColor ? `${accentColor}18` : '#e2e8f0'}`,
      }}>
        <p style={{ fontFamily: font, fontSize: 11.5, color: muted || '#475569', lineHeight: 1.7, margin: 0 }}>
          By signing below, I authorize <strong>{companyName}</strong> to proceed with the work described in this proposal.
          I acknowledge that I have reviewed the scope of work, pricing, payment terms, and all conditions outlined herein.
          This agreement is binding upon signature by both parties.
        </p>
      </div>

      {/* Signature fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        {[
          { title: 'Authorized Representative', sub: companyName },
          { title: 'Client Signature', sub: clientName || 'Client' },
        ].map((sig, i) => (
          <div key={i}>
            <div style={{ height: 48, borderBottom: `2px solid ${dark || '#0f172a'}`, marginBottom: 8 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: dark || '#0f172a' }}>{sig.title}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sig.sub}</div>
            {/* Date line */}
            <div style={{ marginTop: 16, height: 24, borderBottom: '1px solid #cbd5e1' }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Date</div>
          </div>
        ))}
      </div>
    </div>
  );
}