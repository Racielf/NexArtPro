import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import SharedLineItemsTable from './SharedLineItemsTable';
import SharedFinancialSummary from './SharedFinancialSummary';

/**
 * BidDocumentRenderer — Technical/commercial BID presentation
 *
 * Section order (exact):
 *   1.  Header
 *   2.  Project Information
 *   3.  Scope of Work
 *   4.  Base Bid
 *   5.  Alternates / Options
 *   6.  Inclusions
 *   7.  Exclusions
 *   8.  Clarifications
 *   9.  Commercial Terms
 *  10.  Acceptance / Authorization
 *
 * Writing style: technical, structured, commercially precise.
 * CRITICAL: Never exposes book_price, unit_cost, margin, or internal data.
 */

const formatDate = (d) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : null;

const S = {
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', marginBottom: 10, marginTop: 0 },
  sectionBlock: { marginBottom: 24 },
  bodyText: { fontSize: 12, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 },
  divider: { borderTop: '1px solid #e2e8f0', margin: '20px 0' },
  refRow: { display: 'flex', gap: 12, marginBottom: 6, fontSize: 12 },
  refLabel: { color: '#94a3b8', fontWeight: 600, minWidth: 120 },
  refValue: { color: '#0f172a', fontWeight: 500 },
  tinyLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 },
};

const InfoRow = ({ label, value }) => value ? (
  <div style={S.refRow}>
    <span style={S.refLabel}>{label}</span>
    <span style={S.refValue}>{value}</span>
  </div>
) : null;

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

  const isAlternate = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const baseGroups = allGroups.filter(g => !isAlternate(g));
  const alternateGroups = allGroups.filter(g => isAlternate(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  return (
    <div style={{ fontFamily: "'Inter', Arial, sans-serif", fontSize: 13, lineHeight: 1.55, background: 'white', color: '#0f172a', minWidth: 640 }}>

      {/* ═══════ 1. HEADER ═══════ */}
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

      {/* ═══════ 2. PROJECT INFORMATION ═══════ */}
      <div style={{ padding: '28px 48px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={S.sectionLabel}>Project Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={S.tinyLabel}>Owner / Client</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{estimate.client_name}</div>
            {estimate.client_address && <div style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
            {estimate.client_email && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_email}</div>}
            {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_phone}</div>}
          </div>
          <div>
            <div style={S.tinyLabel}>References</div>
            <InfoRow label="Job Number" value={estimate.job_number} />
            <InfoRow label="Plan Reference" value={estimate.plan_reference} />
            {startDate && <InfoRow label="Start Date" value={startDate} />}
            {endDate && <InfoRow label="Completion" value={endDate} />}
            {estimate.assigned_to && <InfoRow label="Project Lead" value={estimate.assigned_to} />}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>

        {/* ═══════ 3. SCOPE OF WORK ═══════ */}
        <div style={{ ...S.sectionBlock, paddingTop: 24 }}>
          <div style={S.sectionLabel}>Scope of Work</div>
          {estimate.title && <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>{estimate.title}</div>}
          {estimate.notes ? (
            <p style={S.bodyText}>{estimate.notes}</p>
          ) : (
            <p style={{ ...S.bodyText, color: '#94a3b8', fontStyle: 'italic' }}>
              The Contractor shall furnish all labor, materials, equipment, and supervision necessary to complete the work described in the line items below, in accordance with the referenced plans and specifications, applicable building codes, and industry-standard workmanship practices.
            </p>
          )}
        </div>

        {/* ═══════ 4. BASE BID ═══════ */}
        {opts.showBreakdown && baseGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Base Bid</div>
            <p style={{ ...S.bodyText, marginBottom: 12 }}>
              The Base Bid includes all labor, materials, and equipment required to complete the scope of work described herein.
            </p>
            <SharedLineItemsTable groups={baseGroups} showPrices={opts.showPrices} />
          </div>
        )}

        {/* ═══════ 5. ALTERNATES / OPTIONS ═══════ */}
        {opts.showBreakdown && alternateGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Alternates / Options</div>
            <p style={{ ...S.bodyText, marginBottom: 12 }}>
              The following alternates are priced separately and may be added to the Base Bid at the Owner's discretion. Alternate pricing is valid only when accepted concurrently with the Base Bid.
            </p>
            <SharedLineItemsTable groups={alternateGroups} showPrices={opts.showPrices} />
          </div>
        )}

        {/* ═══════ 6. INCLUSIONS ═══════ */}
        <div style={S.sectionBlock}>
          <div style={S.sectionLabel}>Inclusions</div>
          {estimate.payment_terms ? (
            <p style={S.bodyText}>{estimate.payment_terms}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 6px 0' }}>This Bid includes the following unless otherwise noted:</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>All labor, materials, and equipment as described in the line items above</li>
                <li>Applicable permits and inspection coordination</li>
                <li>Standard site clean-up and debris removal upon completion</li>
                <li>Project management and scheduling</li>
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 7. EXCLUSIONS ═══════ */}
        <div style={S.sectionBlock}>
          <div style={S.sectionLabel}>Exclusions</div>
          {estimate.exclusions ? (
            <p style={S.bodyText}>{estimate.exclusions}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 6px 0' }}>The following items are expressly excluded from this Bid:</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Work not specifically described in the Scope of Work or line items</li>
                <li>Concealed conditions, hazardous material abatement, or structural modifications not identified</li>
                <li>Utility relocations, temporary services, or engineering beyond specified scope</li>
                <li>Owner-furnished materials or fixtures unless noted</li>
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 8. CLARIFICATIONS ═══════ */}
        <div style={S.sectionBlock}>
          <div style={S.sectionLabel}>Clarifications</div>
          {estimate.warranty_terms ? (
            <p style={S.bodyText}>{estimate.warranty_terms}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>This Bid is based on the plans, specifications, and site conditions as observed at the time of the estimate.</li>
                <li>Any changes to scope, materials, or scheduling requested after acceptance may result in a Change Order with revised pricing.</li>
                <li>All work will be performed during standard business hours (Monday–Friday, 7:00 AM – 5:00 PM) unless otherwise agreed.</li>
                <li>The Contractor warrants all workmanship for a period of one (1) year from the date of substantial completion.</li>
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 9. COMMERCIAL TERMS ═══════ */}
        {opts.showTerms && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Commercial Terms</div>

            {/* Bid Summary — Financial totals */}
            {opts.showPrices && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Bid Summary</div>
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

            {/* Payment Terms */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Payment Terms</div>
              {estimate.payment_terms ? (
                <p style={S.bodyText}>{estimate.payment_terms}</p>
              ) : (
                <p style={S.bodyText}>
                  {depositPct > 0
                    ? `A deposit of ${depositPct}% ($${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}) is due upon execution of this agreement. The remaining balance of $${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} is due upon substantial completion unless alternate billing milestones are agreed upon in writing.`
                    : 'Payment terms: Net 30 from date of invoice. Progress billing may apply for projects exceeding 30 days in duration.'
                  }
                </p>
              )}
            </div>

            {/* Validity */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Bid Validity</div>
              <p style={S.bodyText}>
                This Bid is valid for {estimate.expiration_date ? `the period indicated (through ${expDate})` : 'thirty (30) calendar days from the date of submission'}. After this period, the Contractor reserves the right to revise pricing based on current material costs and labor availability.
              </p>
            </div>

            {/* Legal */}
            {estimate.legal_terms && (
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Additional Terms</div>
                <p style={S.bodyText}>{estimate.legal_terms}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ 10. ACCEPTANCE / AUTHORIZATION ═══════ */}
        {opts.showSignatures && (
          <div style={{ ...S.sectionBlock, paddingTop: 8 }}>
            <div style={S.sectionLabel}>Acceptance / Authorization</div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.65, margin: 0 }}>
                By executing this document, the Owner/Client accepts the above Bid in its entirety and authorizes the Contractor to proceed with the described scope of work under the terms and conditions stated herein. This acceptance constitutes a binding agreement between the parties.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 12 }}>
              {[
                { title: 'Contractor', sub: appConfig.company.name, license: appConfig.company.license ? `License: ${appConfig.company.license}` : null },
                { title: 'Owner / Authorized Representative', sub: estimate.client_name || 'Client' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 48, borderBottom: '2px solid #0f172a', marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                  {sig.license && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{sig.license}</div>}
                  <div style={{ marginTop: 14, height: 24, borderBottom: '1px solid #cbd5e1' }} />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Date</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <div style={{ textAlign: 'center', padding: '14px 48px', borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.06em' }}>
          {appConfig.company.name} · {appConfig.company.address} · {appConfig.company.license ? `License ${appConfig.company.license} · ` : ''}{today}
        </div>
      </div>
    </div>
  );
}