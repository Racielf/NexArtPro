import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import SharedLineItemsTable from './SharedLineItemsTable';
import SharedFinancialSummary from './SharedFinancialSummary';

/**
 * ProposalDocumentRenderer — Client-friendly PROPOSAL presentation
 *
 * Sections:
 *   1. Intro / Cover (Company + Proposal # + greeting)
 *   2. Project Summary (client info, dates, description)
 *   3. Services Included (main line items — shared table)
 *   4. What's Included (notes)
 *   5. Optional Add-ons (alternate groups)
 *   6. Schedule / Timeline (project dates)
 *   7. Investment Summary (shared financials + deposit)
 *   8. Terms (payment, exclusions, warranty, legal)
 *   9. Acceptance (signatures)
 *  10. Footer
 *
 * CRITICAL: Never exposes book_price, unit_cost, margin, or internal data.
 */

const formatDate = (d) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : null;

const S = {
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7c3aed', marginBottom: 8 },
  sectionBlock: { marginBottom: 28 },
  bodyText: { fontSize: 12, color: '#475569', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 },
};

export default function ProposalDocumentRenderer({ estimate, options = {} }) {
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
      ? [{ id: 'legacy', name: null, items: estimate.line_items.map(li => ({ id: li.id, service_name: li.name || li.service_name || '', description: li.description || '', quantity: li.quantity || 1, unit: li.unit || 'ea', unit_price: li.unit_price || 0, line_total: li.total_price || li.line_total || 0 })) }]
      : [];

  const isAddOn = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const mainGroups = allGroups.filter(g => !isAddOn(g));
  const addOnGroups = allGroups.filter(g => isAddOn(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  const ACCENT = '#7c3aed';

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, lineHeight: 1.6, background: 'white', color: '#1f2937', minWidth: 640 }}>

      {/* ══ 1. INTRO / COVER ══ */}
      <div style={{ padding: '40px 48px 28px', borderBottom: `4px solid ${ACCENT}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', marginBottom: 2 }}>{appConfig.company.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>{appConfig.company.tagline}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.8 }}>
              {appConfig.company.address}<br />{appConfig.company.email} · {appConfig.company.phone}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: ACCENT, marginBottom: 4 }}>PROPOSAL</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1 }}>#{estimate.estimate_number || '—'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{today}</div>
            {expDate && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Valid Until: {expDate}</div>}
          </div>
        </div>

        {/* Greeting */}
        <div style={{ marginTop: 24, padding: '16px 20px', background: '#faf5ff', borderRadius: 8, border: `1px solid ${ACCENT}20` }}>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            Dear <strong>{estimate.client_name}</strong>,<br />
            Thank you for the opportunity to provide this proposal. We're excited to work with you and deliver exceptional results.
          </p>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>

        {/* ══ 2. PROJECT SUMMARY ══ */}
        <div style={{ ...S.sectionBlock, paddingTop: 28 }}>
          <div style={S.sectionLabel}>Project Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6 }}>Prepared For</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 4 }}>{estimate.client_name}</div>
              {estimate.client_address && <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
              {estimate.client_email && <div style={{ color: '#9ca3af', fontSize: 11 }}>{estimate.client_email}</div>}
              {estimate.client_phone && <div style={{ color: '#9ca3af', fontSize: 11 }}>{estimate.client_phone}</div>}
            </div>
            <div>
              {estimate.title && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6 }}>Project</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 8 }}>{estimate.title}</div>
                </>
              )}
              {opts.showPrices && (
                <div style={{ background: '#f3f4f6', padding: '14px 16px', borderRadius: 8, marginTop: estimate.title ? 8 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Your Investment</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ 3. SERVICES INCLUDED ══ */}
        {opts.showBreakdown && mainGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Services Included</div>
            <SharedLineItemsTable groups={mainGroups} showPrices={opts.showPrices} accent={ACCENT} />
          </div>
        )}

        {/* ══ 4. WHAT'S INCLUDED ══ */}
        {estimate.notes && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>What's Included</div>
            <div style={{ background: '#faf5ff', border: `1px solid ${ACCENT}20`, borderRadius: 8, padding: '16px 20px' }}>
              <p style={S.bodyText}>{estimate.notes}</p>
            </div>
          </div>
        )}

        {/* ══ 5. OPTIONAL ADD-ONS ══ */}
        {opts.showBreakdown && addOnGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Optional Add-ons</div>
            <SharedLineItemsTable groups={addOnGroups} showPrices={opts.showPrices} accent={ACCENT} />
          </div>
        )}

        {/* ══ 6. SCHEDULE / TIMELINE ══ */}
        {(startDate || endDate) && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Schedule / Timeline</div>
            <div style={{ display: 'flex', gap: 32 }}>
              {startDate && (
                <div style={{ background: '#f9fafb', padding: '14px 20px', borderRadius: 8, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Estimated Start</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{startDate}</div>
                </div>
              )}
              {endDate && (
                <div style={{ background: '#f9fafb', padding: '14px 20px', borderRadius: 8, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Estimated Completion</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{endDate}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 7. INVESTMENT SUMMARY ══ */}
        {opts.showPrices && (
          <div style={S.sectionBlock}>
            <div style={S.sectionLabel}>Investment Summary</div>
            <SharedFinancialSummary
              estimate={estimate}
              total={total}
              depositPct={depositPct}
              depositAmount={depositAmount}
              remaining={remaining}
              showDeposit={depositPct > 0}
              accent={ACCENT}
            />
          </div>
        )}

        {/* ══ 8. TERMS ══ */}
        {opts.showTerms && (
          <>
            {[
              { field: 'exclusions', label: "What's Not Included" },
              { field: 'payment_terms', label: 'Payment Terms' },
              { field: 'warranty_terms', label: 'Warranty' },
              { field: 'legal_terms', label: 'Terms & Conditions' },
            ].filter(s => estimate[s.field]).map(s => (
              <div key={s.field} style={S.sectionBlock}>
                <div style={S.sectionLabel}>{s.label}</div>
                <p style={S.bodyText}>{estimate[s.field]}</p>
              </div>
            ))}
          </>
        )}

        {/* ══ 9. ACCEPTANCE ══ */}
        {opts.showSignatures && (
          <div style={{ ...S.sectionBlock, paddingTop: 4 }}>
            <div style={S.sectionLabel}>Acceptance</div>
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: '14px 20px', border: `1px solid ${ACCENT}20`, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                By signing below, you accept this proposal and authorize us to begin work as described above.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              {[
                { title: 'Authorized Signature', sub: appConfig.company.name },
                { title: 'Client Signature & Date', sub: estimate.client_name || 'Client' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 48, borderBottom: `2px solid ${ACCENT}`, marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{sig.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ 10. FOOTER ══ */}
      <div style={{ textAlign: 'center', padding: '14px 48px', borderTop: `2px solid ${ACCENT}`, marginTop: 8 }}>
        <div style={{ fontSize: 9, color: '#9ca3af' }}>
          {appConfig.company.name} · {appConfig.company.address} · {today}
        </div>
      </div>
    </div>
  );
}