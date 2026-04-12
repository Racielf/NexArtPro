import React from 'react';
import CompanyLogoBlock from '../../documents/CompanyLogoBlock';
import FlexibleDocDates from '../../documents/FlexibleDocDates';
import PaymentMethodsSection from '../../documents/PaymentMethodsSection';
import {
  ExclusionsSection, WarrantySection,
  TimelineSection, PaymentTermsBullets, AcceptanceSection,
} from '../../documents/ProposalSections';
import DocumentAttachmentsSection from '../../documents/DocumentAttachmentsSection';

/**
 * PremiumTemplate — Presentation-level estimate / proposal.
 * Font: Georgia, serif. Colors: warm gold/charcoal palette.
 */

const P = 48;
const FONT = "Georgia, 'Times New Roman', serif";
const DARK = '#1a1a1a';
const MUTED = '#7a7a7a';
const ACCENT = '#b8860b';
const ACCENT_LIGHT = '#f5f0e6';
const BORDER = '#e5e0d5';

const sectionLabel = { fontSize: 11, fontWeight: 700, color: DARK, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${ACCENT}` };

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
          {opts.showExpirationDate && meta.expirationDate && <span>Valid Until: {meta.expirationDate}</span>}
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
          <div style={{ ...sectionLabel, borderBottom: 'none', paddingBottom: 0 }}>Prepared For</div>
          {opts.showCustomerName && <div style={{ fontWeight: 'bold', fontSize: 16, color: DARK, marginBottom: 6 }}>{client.name}</div>}
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ padding: `28px ${P}px` }}>
          <div style={{ ...sectionLabel, borderBottom: 'none', paddingBottom: 0 }}>Project Scope</div>
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
                <span style={{ fontWeight: 'bold', color: ACCENT }}>Total Project Investment</span>
                <span style={{ fontWeight: 'bold', fontSize: 20, color: DARK }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── LINE ITEMS (Scope of Work) ─────────────────────── */}
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
              {/* Services Total row */}
              {lineCols.total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: `2px solid ${ACCENT}`, background: '#faf8f3', marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Services Total</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: DARK }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MATERIALS INCLUDED ───────────────────────────────── */}
      {opts.showMaterials && vm.materials && vm.materials.length > 0 && (
        <div style={{ padding: `24px ${P}px 0` }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, color: DARK, paddingBottom: 6, borderBottom: `2px solid #166534`, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Materials Included</span>
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
          {/* Materials Total row */}
          {showPrices && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '2px solid #166534', background: '#f0fdf4', marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materials Total</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#166534' }}>${vm.materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── TOTALS (Total Project Investment) ─────────────────── */}
      {showPrices && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `20px ${P}px 28px` }}>
          <div style={{ width: 280, borderTop: `2px solid ${ACCENT}`, paddingTop: 12 }}>
            {/* Subtotal — emphasized when discount exists */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: totals.discountAmount > 0 ? '10px 0 8px' : '7px 0', fontSize: totals.discountAmount > 0 ? 14 : 12, color: DARK, fontWeight: totals.discountAmount > 0 ? 700 : 400 }}>
              <span>{totals.discountAmount > 0 ? 'Original Price' : 'Subtotal'}</span>
              <span>${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {/* Discount — red with savings label */}
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: '#b91c1c', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Your Savings
                  <span style={{ fontSize: 9, fontWeight: 600, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px', color: '#b91c1c' }}>
                    {totals.discountType === 'percent' ? `${totals.discountValue}% OFF` : 'DISCOUNT'}
                  </span>
                </span>
                <span>−${totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Tax */}
            {totals.taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12, color: MUTED }}>
                <span>Tax ({totals.taxRate}%)</span>
                <span>${totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 6, borderTop: `2px solid ${DARK}` }}>
              <span style={{ fontWeight: 'bold', color: DARK, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Project Investment</span>
              <span style={{ fontWeight: 'bold', fontSize: 20, color: DARK }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEPOSIT ────────────────────────────────────────── */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && showPrices && (
        <div style={{ margin: `0 ${P}px 24px`, padding: '16px 20px', background: ACCENT_LIGHT, border: `1px solid ${ACCENT}`, borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Deposit Required to Commence Work</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: DARK }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 'normal', color: MUTED }}>({totals.depositPercent}%)</span></div>
            <div style={{ fontSize: 12, color: MUTED }}>Balance: ${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {/* ─── NOTES ──────────────────────────────────────────── */}
      {opts.showNotes && text.notes && (
        <div style={{ padding: `0 ${P}px 20px`, background: ACCENT_LIGHT, margin: `0 0 0`, borderBottom: `1px solid ${BORDER}`, paddingTop: 20 }}>
          <div style={sectionLabel}>Project Notes</div>
          <p style={{ color: '#555', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── EXCLUSIONS ─────────────────────────────────────── */}
      {text.exclusions && (
        <div style={{ padding: `0 ${P}px` }}>
          <ExclusionsSection exclusions={text.exclusions} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── WARRANTY ───────────────────────────────────────── */}
      {text.warrantyTerms && (
        <div style={{ padding: `0 ${P}px` }}>
          <WarrantySection warrantyTerms={text.warrantyTerms} font={FONT} muted="#555" sectionLabelStyle={sectionLabel} accentColor={ACCENT} />
        </div>
      )}

      {/* ─── ESTIMATED TIMELINE ─────────────────────────────── */}
      {(project.startDate || project.endDate) && (
        <div style={{ padding: `0 ${P}px` }}>
          <TimelineSection
            startDate={project.startDate} endDate={project.endDate}
            font={FONT} dark={DARK} muted={MUTED} border={BORDER}
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── PAYMENT TERMS (bullet format) ──────────────────── */}
      {opts.showTerms && (
        <div style={{ padding: `0 ${P}px` }}>
          <PaymentTermsBullets
            paymentTerms={text.paymentTerms}
            depositPercent={totals.depositPercent}
            depositAmount={totals.depositAmount}
            total={totals.total}
            font={FONT} muted="#555"
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── PAYMENT METHODS ────────────────────────────────── */}
      {company.paymentMethods && company.paymentMethods.trim() && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <div style={sectionLabel}>Payment Methods</div>
          <PaymentMethodsSection
            paymentMethods={company.paymentMethods}
            sectionLabelStyle={{ display: 'none' }}
            textStyle={{ color: '#555', fontSize: 12, lineHeight: 1.8 }}
            containerStyle={{}}
          />
        </div>
      )}

      {/* ─── LEGAL TERMS ────────────────────────────────────── */}
      {opts.showTerms && text.legalTerms && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <div style={sectionLabel}>Terms & Conditions</div>
          <p style={{ color: '#555', fontSize: 11, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{text.legalTerms}</p>
        </div>
      )}

      {/* ─── INCLUDED DOCUMENTS ─────────────────────────────── */}
      {vm.clientAttachments && vm.clientAttachments.length > 0 && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <DocumentAttachmentsSection
            attachments={vm.clientAttachments}
            font={FONT}
            sectionLabelStyle={sectionLabel}
            accentColor={ACCENT}
          />
        </div>
      )}

      {/* ─── CLIENT ACCEPTANCE ──────────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ padding: `24px ${P}px`, borderTop: `1px solid ${BORDER}` }}>
          <AcceptanceSection
            companyName={company.name} clientName={client.name}
            font={FONT} dark={DARK} muted="#555" border={BORDER}
            sectionLabelStyle={sectionLabel} accentColor={ACCENT}
          />
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