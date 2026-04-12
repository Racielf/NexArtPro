import React from 'react';
import CompanyLogoBlock from '../../documents/CompanyLogoBlock';
import FlexibleDocDates from '../../documents/FlexibleDocDates';

/**
 * CleanTemplate — Modern professional contractor estimate.
 * Structure: Logo+company left | doc info right → client|project grid → clean table → totals right → terms → signatures
 * Font: Inter, sans-serif. Colors: slate/navy palette. No cards, no background tints on body.
 */

const P = 44; // horizontal padding
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const LIGHT_BG = '#f8fafc';

const sectionLabel = { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 };

export default function CleanTemplate({ vm }) {
  const { meta, company, client, project, visibility: opts, groups, totals, text, columns: lineCols, termsArray } = vm;
  const { isWorkOrder, isEstimate, showPrices } = opts;

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, background: 'white', color: DARK, minWidth: 640 }}>

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: DARK, padding: `32px ${P}px 28px`, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <CompanyLogoBlock logoUrl={company.logoUrl} size={46} borderColor="#3b82f6" bgColor={DARK} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{company.name}</div>
              {company.tagline && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{company.tagline}</div>}
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, marginTop: 6 }}>
                {company.address && <div>{company.address}</div>}
                <div>{[company.email, company.phone].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>{meta.documentTypeLabel}</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-1px', marginTop: 4 }}>#{meta.documentNumber || '—'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{meta.today}</div>
            {meta.expirationDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Expires: {meta.expirationDate}</div>}
            {meta.status && meta.status !== 'draft' && (
              <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: meta.statusStyle?.bg || '#334155', color: meta.statusStyle?.color || '#94a3b8' }}>
                {meta.statusLabel || meta.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CLIENT + PROJECT ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: `24px ${P}px`, borderRight: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{client.name}</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ padding: `24px ${P}px` }}>
          <div style={sectionLabel}>Project Details</div>
          {project.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{project.title}</div>}
          {opts.showProjectDates && project.hasProjectDates && (
            <FlexibleDocDates mode="block" docDate={null} startDate={project.startDate} endDate={project.endDate} font={FONT} />
          )}
          {project.assignedTo && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
              <span style={{ ...sectionLabel, display: 'inline', marginBottom: 0, marginRight: 6 }}>Assigned:</span>{project.assignedTo}
            </div>
          )}
        </div>
      </div>

      {/* ─── LINE ITEMS ─────────────────────────────────────── */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ padding: `24px ${P}px 0` }}>
          {groups.map((group, gi) => {
            const showGroupHeader = group.name && groups.length > 1;
            return (
              <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 24 : 8 }}>
                {showGroupHeader && (
                  <div style={{ background: DARK, color: 'white', fontWeight: 700, fontSize: 11, padding: '7px 14px', borderRadius: '6px 6px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{group.name}</span>
                    {lineCols.total && <span style={{ color: '#94a3b8', fontSize: 11 }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: LIGHT_BG }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `2px solid ${BORDER}` }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: MUTED, width: 55, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: MUTED, width: 55, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: MUTED, width: 100, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, fontWeight: 600, color: MUTED, width: 110, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {lineCols.description && <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: DARK }}>{item.service_name}</div>
                          {item.description && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={{ textAlign: 'right', padding: '10px 12px', color: MUTED }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'right', padding: '10px 12px', color: MUTED }}>{item.unit}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '10px 12px', color: MUTED }}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: DARK }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TOTALS ─────────────────────────────────────────── */}
      {showPrices && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `16px ${P}px 24px` }}>
          <div style={{ width: 260 }}>
            {[
              { show: true, label: 'Subtotal', value: totals.subtotal },
              { show: totals.discountAmount > 0, label: 'Discount', value: -totals.discountAmount, color: '#dc2626' },
              { show: totals.taxRate > 0, label: `Tax (${totals.taxRate}%)`, value: totals.taxAmount },
            ].filter(r => r.show).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: r.color || MUTED, borderBottom: '1px solid #f1f5f9' }}>
                <span>{r.label}</span>
                <span>${Math.abs(r.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 16, fontWeight: 800, color: DARK, borderTop: `2px solid ${BORDER}`, marginTop: 4 }}>
              <span>TOTAL</span>
              <span>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEPOSIT ────────────────────────────────────────── */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && showPrices && (
        <div style={{ margin: `0 ${P}px 20px`, padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Deposit Required to Start</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 400, color: '#3b82f6' }}>({totals.depositPercent}%)</span></div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Remaining: ${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} — due upon completion.</div>
        </div>
      )}

      {/* ─── NOTES ──────────────────────────────────────────── */}
      {text.notes && (
        <div style={{ padding: `16px ${P}px`, borderTop: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── TERMS ──────────────────────────────────────────── */}
      {opts.showTerms && termsArray.map(t => (
        <div key={t.key} style={{ padding: `14px ${P}px`, borderTop: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>{t.label}</div>
          <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{t.value}</p>
        </div>
      ))}

      {/* ─── SIGNATURES ─────────────────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ padding: `28px ${P}px 24px`, borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          {[{ label: 'Authorized Signature' }, { label: 'Customer Signature & Date' }].map((sig, i) => (
            <div key={i}>
              <div style={{ borderBottom: `2px solid #cbd5e1`, paddingBottom: 36, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{sig.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <div style={{ padding: `10px ${P}px`, borderTop: `1px solid ${BORDER}`, background: LIGHT_BG, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
        <span>{company.name}{company.license ? ` · License ${company.license}` : ''}</span>
        <span>{meta.today}</span>
      </div>
    </div>
  );
}