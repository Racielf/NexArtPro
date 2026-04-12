import React from 'react';
import CompanyLogoBlock from '../../documents/CompanyLogoBlock';
import FlexibleDocDates from '../../documents/FlexibleDocDates';

/**
 * ModernCardTemplate — Contemporary SaaS-style document with card sections.
 * Structure: Page background #f1f5f9 → Header card (dark) → Client/Project cards (2-col) → Services card → Totals + Deposit cards (2-col) → Notes card → Terms card → Signatures card → Footer
 * Font: Inter, sans-serif. Colors: slate/navy palette with card shadows.
 */

const GP = 36; // global page padding
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#2563eb';
const BORDER = '#e2e8f0';

const card = (extra = {}) => ({
  background: 'white', borderRadius: 12, border: `1px solid ${BORDER}`,
  boxShadow: '0 1px 6px rgba(15,23,42,0.06)', overflow: 'hidden', ...extra,
});
const sectionLabel = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 };

export default function ModernCardTemplate({ vm }) {
  const { meta, company, client, project, visibility: opts, groups, totals, text, columns: lineCols, termsArray } = vm;
  const { isWorkOrder, isEstimate, showPrices } = opts;

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, background: '#f1f5f9', color: DARK, minWidth: 640, padding: GP }}>

      {/* ─── HEADER CARD ────────────────────────────────────── */}
      <div style={{ ...card(), background: DARK, color: 'white', padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <CompanyLogoBlock logoUrl={company.logoUrl} size={48} borderColor={ACCENT} bgColor={DARK} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{company.name}</div>
              {company.tagline && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{company.tagline}</div>}
              <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, marginTop: 4 }}>
                {company.address && <span>{company.address} · </span>}
                {[company.email, company.phone].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>{meta.documentTypeLabel}</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 2 }}>#{meta.documentNumber || '—'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{meta.today}</div>
            {meta.expirationDate && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Exp: {meta.expirationDate}</div>}
            {meta.status && meta.status !== 'draft' && (
              <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
                {meta.statusLabel || meta.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CLIENT + PROJECT CARDS ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={sectionLabel}>Client</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{client.name}</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={sectionLabel}>Project</div>
          {project.title && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{project.title}</div>}
          <FlexibleDocDates
            mode="inline"
            docDate={meta.today}
            startDate={project.startDate}
            endDate={project.endDate}
            showDocumentDate={opts.showDocumentDate}
            showStartDate={opts.showProjectStartDate}
            showEndDate={opts.showProjectEndDate}
            font={FONT}
          />
          {project.assignedTo && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Lead:</span> {project.assignedTo}
            </div>
          )}
          {!project.title && !project.hasProjectDates && !project.assignedTo && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No details specified</div>
          )}
        </div>
      </div>

      {/* ─── SERVICES CARD ──────────────────────────────────── */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ ...card(), marginBottom: 20 }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi}>
              {group.name && (
                <div style={{ background: DARK, color: 'white', padding: '9px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{group.name}</span>
                  {lineCols.total && <span style={{ fontSize: 11, color: '#94a3b8' }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: MUTED, width: 55, textTransform: 'uppercase' }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: MUTED, width: 55, textTransform: 'uppercase' }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 10, fontWeight: 700, color: MUTED, width: 100, textTransform: 'uppercase' }}>Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, width: 110, textTransform: 'uppercase' }}>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                      {lineCols.description && (
                        <td style={{ padding: '12px 24px' }}>
                          <div style={{ fontWeight: 600, color: DARK }}>{item.service_name}</div>
                          {item.description && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{item.description}</div>}
                        </td>
                      )}
                      {lineCols.quantity && <td style={{ textAlign: 'center', padding: '12px', color: '#475569' }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'center', padding: '12px', color: '#475569', fontSize: 12 }}>{item.unit}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '12px 20px', color: '#475569' }}>${item.unit_price.toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '12px 24px', fontWeight: 700, color: DARK }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ─── TOTALS + DEPOSIT CARDS ─────────────────────────── */}
      {showPrices && (
        <div style={{ display: 'grid', gridTemplateColumns: isEstimate && totals.depositPercent > 0 && opts.showDeposit ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ ...card(), padding: '22px 24px' }}>
            <div style={sectionLabel}>Summary</div>
            {[
              { show: true, label: 'Subtotal', value: totals.subtotal },
              { show: totals.discountAmount > 0, label: 'Discount', value: -totals.discountAmount, color: '#dc2626' },
              { show: totals.taxRate > 0, label: `Tax (${totals.taxRate}%)`, value: totals.taxAmount },
            ].filter(r => r.show).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: r.color || '#475569', borderBottom: '1px solid #f1f5f9' }}>
                <span>{r.label}</span>
                <span>${Math.abs(r.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 16, fontWeight: 800, color: DARK, borderTop: `2px solid #dbeafe`, marginTop: 4 }}>
              <span>TOTAL</span>
              <span>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {isEstimate && totals.depositPercent > 0 && opts.showDeposit && (
            <div style={{ ...card(), padding: '22px 24px', background: '#dbeafe', border: `1.5px solid ${ACCENT}` }}>
              <div style={{ ...sectionLabel, color: ACCENT }}>Payment Schedule</div>
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${ACCENT}30` }}>
                <div style={{ fontSize: 11, color: ACCENT, marginBottom: 4, fontWeight: 600 }}>Deposit to Start</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3 }}>{totals.depositPercent}% of total</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>Remaining</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: DARK, marginTop: 2 }}>${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── NOTES CARD ─────────────────────────────────────── */}
      {text.notes && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20, borderLeft: `4px solid ${ACCENT}` }}>
          <div style={sectionLabel}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── TERMS CARD ─────────────────────────────────────── */}
      {opts.showTerms && termsArray.length > 0 && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          {termsArray.map((t, i) => (
            <div key={t.key} style={{ paddingBottom: i < termsArray.length - 1 ? 14 : 0, marginBottom: i < termsArray.length - 1 ? 14 : 0, borderBottom: i < termsArray.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={sectionLabel}>{t.label}</div>
              <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── SIGNATURES CARD ────────────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ ...card(), padding: '24px 32px', marginBottom: 20 }}>
          <div style={sectionLabel}>Authorization</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 4 }}>
            {[
              { title: 'Contractor', sub: `${company.name}` },
              { title: 'Client Signature & Date', sub: client.name || 'Client' }
            ].map((sig, i) => (
              <div key={i}>
                <div style={{ height: 48, borderBottom: `2px solid ${DARK}`, marginBottom: 8 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: DARK }}>{sig.title}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sig.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '12px 0 0', opacity: 0.4 }}>
        <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>
          {company.name} · {company.address}{company.license ? ` · License ${company.license}` : ''} · {meta.today}
        </div>
      </div>
    </div>
  );
}