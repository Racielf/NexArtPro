import React from 'react';
import CompanyLogoBlock from '../../documents/CompanyLogoBlock';
import FlexibleDocDates from '../../documents/FlexibleDocDates';
import PaymentMethodsSection from '../../documents/PaymentMethodsSection';

/**
 * PremiumTemplate — Presentation-level estimate / proposal.
 * Structure: Full-width logo+company centered → accent divider → doc meta bar → "Prepared For" / "Project" formal blocks → line items with elegant header → formal totals → deposit badge → terms blocks → signature area → centered footer
 * Font: Georgia, serif. Colors: warm gold/charcoal palette.
 */

const P = 48;
const FONT = "Georgia, 'Times New Roman', serif";
const DARK = '#1a1a1a';
const MUTED = '#7a7a7a';
const ACCENT = '#b8860b';
const ACCENT_LIGHT = '#f5f0e6';
const BORDER = '#e5e0d5';

const sectionLabel = { fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 };

export default function PremiumTemplate({ vm }) {
  const { meta, company, client, project, visibility: opts, groups, totals, text, columns: lineCols, termsArray } = vm;
  const { isWorkOrder, isEstimate, showPrices } = opts;

  return (
    <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.6, background: 'white', color: DARK, minWidth: 640 }}>

      {/* ─── HEADER (centered branding) ─────────────────────── */}
      <div style={{ padding: `40px ${P}px 0`, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          {opts.showBusinessLogo && <CompanyLogoBlock logoUrl={company.logoUrl} size={96} borderColor={ACCENT} bgColor="#faf8f3" />}
          <div style={{ textAlign: 'left' }}>
            {opts.showBusinessName && <div style={{ fontSize: 24, fontWeight: 'bold', color: DARK, letterSpacing: '-0.3px' }}>{company.name}</div>}
            {opts.showBusinessName && company.tagline && <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>{company.tagline}</div>}
          </div>
        </div>
        {opts.showBusinessAddress && (
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>
            {[company.address, company.email, company.phone].filter(Boolean).join(' · ')}
          </div>
        )}
        <div style={{ height: 2, background: ACCENT, marginBottom: 0 }} />
      </div>

      {/* ─── DOCUMENT META BAR ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `16px ${P}px`, background: ACCENT_LIGHT, borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: DARK }}>{meta.documentTypeLabel}</span>
          {opts.showEstimateNumber && <span style={{ fontSize: 13, color: MUTED, marginLeft: 8 }}>#{meta.documentNumber || '—'}</span>}
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: MUTED }}>
          {opts.showDocumentDate && <span>{meta.today}</span>}
          {opts.showExpirationDate && meta.expirationDate && <span>Expires: {meta.expirationDate}</span>}
          {meta.status && meta.status !== 'draft' && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: meta.statusStyle?.bg || '#e2e8f0', color: meta.statusStyle?.color || DARK }}>
              {meta.statusLabel || meta.status}
            </span>
          )}
        </div>
      </div>

      {/* ─── PREPARED FOR + PROJECT ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: `28px ${P}px`, borderRight: `1px solid ${BORDER}` }}>
          <div style={sectionLabel}>Prepared For</div>
          {opts.showCustomerName && <div style={{ fontWeight: 'bold', fontSize: 16, color: DARK, marginBottom: 6 }}>{client.name}</div>}
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ padding: `28px ${P}px` }}>
          <div style={sectionLabel}>Project Scope</div>
          {opts.showEstimateName && project.title && <div style={{ fontWeight: 'bold', fontSize: 14, color: DARK, marginBottom: 10 }}>{project.title}</div>}
          <FlexibleDocDates
            mode="formal"
            docDate={meta.today}
            startDate={project.startDate}
            endDate={project.endDate}
            showDocumentDate={opts.showDocumentDate}
            showStartDate={opts.showProjectStartDate}
            showEndDate={opts.showProjectEndDate}
            accentColor={ACCENT}
            font={FONT}
          />
          {opts.showTechnicianName && project.assignedTo && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <span style={{ color: MUTED }}>Lead: </span><span style={{ fontWeight: 'bold' }}>{project.assignedTo}</span>
            </div>
          )}
          {showPrices && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${ACCENT}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ fontWeight: 'bold', color: ACCENT }}>Total</span>
                <span style={{ fontWeight: 'bold', fontSize: 18, color: DARK }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── LINE ITEMS ─────────────────────────────────────── */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ padding: `24px ${P}px 0` }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 24 : 12 }}>
              {group.name && (
                <div style={{ fontWeight: 'bold', fontSize: 13, color: DARK, paddingBottom: 6, borderBottom: `2px solid ${ACCENT}`, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{group.name}</span>
                  {lineCols.total && <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#faf8f3' }}>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, borderBottom: `1px solid ${BORDER}` }}>Description</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'center', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 55, borderBottom: `1px solid ${BORDER}` }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'center', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 45, borderBottom: `1px solid ${BORDER}` }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 90, borderBottom: `1px solid ${BORDER}` }}>Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 100, borderBottom: `1px solid ${BORDER}` }}>Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: `1px solid #ede8df` }}>
                      {lineCols.description && <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 'bold', color: DARK }}>{item.service_name}</div>
                        {item.description && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{item.description}</div>}
                      </td>}
                      {lineCols.quantity && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.unit}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: ACCENT }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ─── TOTALS ─────────────────────────────────────────── */}
      {showPrices && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `16px ${P}px 24px` }}>
          <div style={{ width: 280, borderTop: `2px solid ${ACCENT}`, paddingTop: 12 }}>
            {[
              { show: true, label: 'Subtotal', value: totals.subtotal },
              { show: totals.discountAmount > 0, label: 'Discount', value: -totals.discountAmount, color: '#b91c1c' },
              { show: totals.taxRate > 0, label: `Tax (${totals.taxRate}%)`, value: totals.taxAmount },
            ].filter(r => r.show).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12, color: r.color || MUTED }}>
                <span>{r.label}</span>
                <span>${Math.abs(r.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 16, fontWeight: 'bold', color: DARK, borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
              <span>Total Due</span>
              <span>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEPOSIT ────────────────────────────────────────── */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && showPrices && (
        <div style={{ margin: `0 ${P}px 20px`, padding: '16px 20px', background: ACCENT_LIGHT, border: `1px solid ${ACCENT}`, borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Deposit Required to Commence Work</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: DARK }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 'normal', color: MUTED }}>({totals.depositPercent}%)</span></div>
            <div style={{ fontSize: 12, color: MUTED }}>Balance: ${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {/* ─── NOTES (after line items / totals / deposit) ──────── */}
      {opts.showNotes && text.notes && (
        <div style={{ padding: `20px ${P}px`, borderBottom: `1px solid ${BORDER}`, background: ACCENT_LIGHT }}>
          <div style={sectionLabel}>Project Notes</div>
          <p style={{ color: '#555', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── MATERIALS ───────────────────────────────────────── */}
      {opts.showMaterials && vm.materials && vm.materials.length > 0 && (
        <div style={{ padding: `24px ${P}px 0` }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: DARK, paddingBottom: 6, borderBottom: `2px solid #166534`, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Materials</span>
            {showPrices && <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>${vm.materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf8f3' }}>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, borderBottom: `1px solid ${BORDER}` }}>Material</th>
                <th style={{ textAlign: 'center', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 55, borderBottom: `1px solid ${BORDER}` }}>Qty</th>
                <th style={{ textAlign: 'center', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 45, borderBottom: `1px solid ${BORDER}` }}>Unit</th>
                {showPrices && <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 90, borderBottom: `1px solid ${BORDER}` }}>Price</th>}
                {showPrices && <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 10, fontWeight: 'bold', color: DARK, width: 100, borderBottom: `1px solid ${BORDER}` }}>Amount</th>}
              </tr>
            </thead>
            <tbody>
              {vm.materials.map((m, idx) => (
                <tr key={m.id || idx} style={{ borderBottom: '1px solid #ede8df' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ fontWeight: 'bold', color: DARK }}>{m.name}</div>
                    {m.description && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{m.description}</div>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{m.quantity}</td>
                  <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{m.unit}</td>
                  {showPrices && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${m.unit_price.toFixed(2)}</td>}
                  {showPrices && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: ACCENT }}>${m.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TERMS ──────────────────────────────────────────── */}
      {opts.showTerms && termsArray.length > 0 && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          {termsArray.map((t, i) => (
            <div key={t.key} style={{ paddingTop: 14, marginTop: i > 0 ? 14 : 0, borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={sectionLabel}>{t.label}</div>
              <p style={{ color: '#555', fontSize: 11, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── PAYMENT METHODS ────────────────────────────────── */}
      <PaymentMethodsSection
        paymentMethods={company.paymentMethods}
        sectionLabelStyle={sectionLabel}
        textStyle={{ color: '#555', fontSize: 12, lineHeight: 1.8 }}
        containerStyle={{ padding: `20px ${P}px`, borderTop: `1px solid ${BORDER}` }}
      />

      {/* ─── SIGNATURES ─────────────────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ padding: `28px ${P}px 24px`, borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
          {[
            { title: 'Contractor', sub: `${company.name} — Authorized Representative` },
            { title: 'Client Acceptance', sub: 'Signature & Date' }
          ].map((sig, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{sig.title}</div>
              <div style={{ borderBottom: `2px solid ${DARK}`, paddingBottom: 40, marginBottom: 8 }} />
              <div style={{ fontSize: 10, color: MUTED }}>{sig.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: `14px ${P}px`, borderTop: `2px solid ${ACCENT}` }}>
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em' }}>
          {company.name} · {company.address}{company.license ? ` · License ${company.license}` : ''} · {meta.today}
        </div>
      </div>
    </div>
  );
}