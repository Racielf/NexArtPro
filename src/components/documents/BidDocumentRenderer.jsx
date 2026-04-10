import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import SharedLineItemsTable from './SharedLineItemsTable';
import SharedFinancialSummary from './SharedFinancialSummary';

/**
 * BidDocumentRenderer — Technical/commercial BID presentation
 *
 * Sections:
 *   1. Header (Company + BID number)
 *   2. Project Information (job#, plan ref, client, dates)
 *   3. Scope of Work (project title + notes)
 *   4. Base Bid (line items table — shared component)
 *   5. Alternates / Options (groups named "alternate" or "option")
 *   6. Inclusions
 *   7. Exclusions
 *   8. Clarifications
 *   9. Commercial Terms (payment, warranty, legal)
 *  10. Financial Summary (shared component)
 *  11. Signature / Acceptance
 *  12. Footer
 *
 * CRITICAL: Never exposes book_price, unit_cost, margin, or internal data.
 */

const formatDate = (d) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : null;

const S = {
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', marginBottom: 8 },
  sectionBlock: { marginBottom: 24 },
  divider: { borderTop: '1px solid #e2e8f0', margin: '20px 0' },
  bodyText: { fontSize: 12, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 },
};

export default function BidDocumentRenderer({ estimate, options = {} }) {
  if (!estimate) return null;

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    hideInternalNotes: options.hideInternalNotes !== false,
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expDate = formatDate(estimate.expiration_date);
  const startDate = formatDate(estimate.project_start_date);
  const endDate = formatDate(estimate.project_end_date);

  const allGroups = estimate.groups?.length
    ? estimate.groups
    : estimate.line_items?.length
      ? [{ id: 'legacy', name: 'Base Bid', items: estimate.line_items.map(li => ({ id: li.id, service_name: li.name || li.service_name || '', description: li.description || '', quantity: li.quantity || 1, unit: li.unit || 'ea', unit_price: li.unit_price || 0, line_total: li.total_price || li.line_total || 0 })) }]
      : [];

  // Separate base bid groups from alternate/option groups
  const isAlternate = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const baseGroups = allGroups.filter(g => !isAlternate(g));
  const alternateGroups = allGroups.filter(g => isAlternate(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 12 }}>
      <span style={{ color: '#94a3b8', fontWeight: 600, minWidth: 110 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 500 }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.55, background: 'white', color: '#0f172a', minWidth: 640 }}>

      {/* ══ 1. HEADER ══ */}
      <div style={{ background: '#0f172a', padding: '32px 48px 26px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 40 40" width="26" height="26" fill="none">
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{appConfig.company.name}</div>
                <div style={{ color: '#64748b', fontSize: 10 }}>{appConfig.company.tagline}</div>
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.8 }}>
              {appConfig.company.address}<br />{appConfig.company.email} · {appConfig.company.phone}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', marginBottom: 4 }}>BID</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>#{estimate.estimate_number || '—'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{today}</div>
            {expDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Valid Until: {expDate}</div>}
          </div>
        </div>
      </div>

      {/* ══ 2. PROJECT INFORMATION ══ */}
      <div style={{ padding: '28px 48px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={S.sectionLabel}>Project Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>Owner / Client</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{estimate.client_name}</div>
            {estimate.client_address && <div style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
            {estimate.client_email && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_email}</div>}
            {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_phone}</div>}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>References</div>
            <InfoRow label="Job Number" value={estimate.job_number} />
            <InfoRow label="Plan Reference" value={estimate.plan_reference} />
            {startDate && <InfoRow label="Start Date" value={startDate} />}
            {endDate && <InfoRow label="Completion" value={endDate} />}
            {estimate.assigned_to && <InfoRow label="Project Lead" value={estimate.assigned_to} />}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>

        {/* ══ 3. SCOPE OF WORK ══ */}
        {(estimate.title || estimate.notes) && (
          <div style={{ ...S.sectionBlock, paddingTop: 24 }}>
            <div style={S.sectionLabel}>Scope of Work</div>
            {estimate.title && <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>{estimate.title}</div>}
            {estimate.notes && <p style={S.bodyText}>{estimate.notes}</p>}
          </div>
        )}

        {/* ══ 4. BASE BID ══ */}
        {opts.showBreakdown && baseGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Base Bid</div>
            <SharedLineItemsTable groups={baseGroups} showPrices={opts.showPrices} />
          </div>
        )}

        {/* ══ 5. ALTERNATES / OPTIONS ══ */}
        {opts.showBreakdown && alternateGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Alternates / Options</div>
            <SharedLineItemsTable groups={alternateGroups} showPrices={opts.showPrices} />
          </div>
        )}

        {/* ══ 6–8. INCLUSIONS / EXCLUSIONS / CLARIFICATIONS ══ */}
        {opts.showTerms && (
          <>
            {estimate.payment_terms && (
              <div style={S.sectionBlock}>
                <div style={S.sectionLabel}>Inclusions</div>
                <p style={S.bodyText}>{estimate.payment_terms}</p>
              </div>
            )}

            {estimate.exclusions && (
              <div style={S.sectionBlock}>
                <div style={S.sectionLabel}>Exclusions</div>
                <p style={S.bodyText}>{estimate.exclusions}</p>
              </div>
            )}

            {estimate.warranty_terms && (
              <div style={S.sectionBlock}>
                <div style={S.sectionLabel}>Clarifications</div>
                <p style={S.bodyText}>{estimate.warranty_terms}</p>
              </div>
            )}
          </>
        )}

        {/* ══ 9. COMMERCIAL TERMS ══ */}
        {opts.showTerms && estimate.legal_terms && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Commercial Terms</div>
            <p style={S.bodyText}>{estimate.legal_terms}</p>
          </div>
        )}

        {/* ══ 10. FINANCIAL SUMMARY ══ */}
        {opts.showPrices && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Bid Summary</div>
            <SharedFinancialSummary
              estimate={estimate}
              total={total}
              depositPct={depositPct}
              depositAmount={depositAmount}
              remaining={remaining}
              showDeposit={depositPct > 0}
            />
          </div>
        )}

        {/* ══ 11. SIGNATURE / ACCEPTANCE ══ */}
        {opts.showSignatures && (
          <div style={{ ...S.sectionBlock, paddingTop: 8 }}>
            <div style={S.sectionLabel}>Acceptance</div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                By signing below, the Owner/Client accepts this Bid and authorizes the Contractor to proceed with the described scope of work under the terms stated herein.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 12 }}>
              {[
                { title: 'Contractor', sub: `${appConfig.company.name}` },
                { title: 'Owner / Client', sub: estimate.client_name || 'Client' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 48, borderBottom: '2px solid #0f172a', marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                  <div style={{ marginTop: 12, height: 24, borderBottom: '1px solid #cbd5e1' }} />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Date</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ 12. FOOTER ══ */}
      <div style={{ textAlign: 'center', padding: '14px 48px', borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.06em' }}>
          {appConfig.company.name} · {appConfig.company.address} · License {appConfig.company.license} · {today}
        </div>
      </div>
    </div>
  );
}