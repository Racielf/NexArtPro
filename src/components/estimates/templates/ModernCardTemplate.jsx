import React from 'react';
import CompanyLogoBlock from '../../documents/CompanyLogoBlock';
import FlexibleDocDates from '../../documents/FlexibleDocDates';
import PaymentMethodsSection from '../../documents/PaymentMethodsSection';
import {
  ExclusionsSection, WarrantySection,
  TimelineSection, PaymentTermsBullets, AcceptanceSection,
  ScopeSummarySection, AssumptionsSection, ChangeRequestSection,
  WhatsIncludedSection,
} from '../../documents/ProposalSections';
import DocumentAttachmentsSection from '../../documents/DocumentAttachmentsSection';

/**
 * ModernCardTemplate — Contemporary SaaS-style document with card sections.
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
const sectionLabel = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#334155', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${BORDER}` };
const cardSectionLabel = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 };

export default function ModernCardTemplate({ vm }) {
  const { meta, company, client, project, visibility: opts, groups, totals, text, contingency, columns: lineCols, termsArray } = vm;
  const ct = contingency || {};
  const { isWorkOrder, isEstimate, showPrices } = opts;

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, background: '#f1f5f9', color: DARK, minWidth: 640, padding: GP }}>

      {/* ─── HEADER CARD ────────────────────────────────────── */}
      <div style={{ ...card(), background: DARK, color: 'white', padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {opts.showBusinessLogo && <CompanyLogoBlock logoUrl={company.logoUrl} size={96} borderColor={ACCENT} bgColor={DARK} />}
            <div>
              {opts.showBusinessName && <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{company.name}</div>}
              {opts.showBusinessName && company.tagline && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{company.tagline}</div>}
              {opts.showBusinessAddress && (
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, marginTop: 4 }}>
                  {company.address && <span>{company.address} · </span>}
                  {[company.email, company.phone].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>{meta.documentTypeLabel}</div>
            {opts.showEstimateNumber && <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 2 }}>#{meta.documentNumber || '—'}</div>}
            {opts.showDocumentDate && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{meta.today}</div>}
            {opts.showExpirationDate && meta.expirationDate && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Valid Until: {meta.expirationDate}</div>}
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
          <div style={cardSectionLabel}>Client</div>
          {opts.showCustomerName && <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{client.name}</div>}
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={cardSectionLabel}>Project</div>
          {opts.showEstimateName && project.title && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{project.title}</div>}
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
          {opts.showTechnicianName && project.assignedTo && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Lead:</span> {project.assignedTo}
            </div>
          )}
          {!project.title && !project.hasProjectDates && !project.assignedTo && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No details specified</div>
          )}
        </div>
      </div>

      {/* ─── SERVICES CARD (Scope of Work) ──────────────────── */}
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
              {/* Services Total row */}
              {lineCols.total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: `2px solid ${DARK}`, background: '#f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Services Total</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: DARK }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MATERIALS INCLUDED CARD ─────────────────────────── */}
      {opts.showMaterials && vm.materials && vm.materials.length > 0 && (
        <div style={{ ...card(), marginBottom: 20 }}>
          <div style={{ background: '#166534', color: 'white', padding: '9px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Materials Included</span>
            {showPrices && <span style={{ fontSize: 11, color: '#bbf7d0' }}>${vm.materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Material</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: MUTED, width: 55, textTransform: 'uppercase' }}>Qty</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: MUTED, width: 55, textTransform: 'uppercase' }}>Unit</th>
                {showPrices && <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 10, fontWeight: 700, color: MUTED, width: 100, textTransform: 'uppercase' }}>Price</th>}
                {showPrices && <th style={{ textAlign: 'right', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, width: 110, textTransform: 'uppercase' }}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {vm.materials.map((m, idx) => (
                <tr key={m.id || idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ fontWeight: 600, color: DARK }}>{m.name}</div>
                    {m.description && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{m.description}</div>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#475569' }}>{m.quantity}</td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#475569', fontSize: 12 }}>{m.unit}</td>
                  {showPrices && <td style={{ textAlign: 'right', padding: '12px 20px', color: '#475569' }}>${m.unit_price.toFixed(2)}</td>}
                  {showPrices && <td style={{ textAlign: 'right', padding: '12px 24px', fontWeight: 700, color: DARK }}>${m.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Materials Total row */}
          {showPrices && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '2px solid #166534', background: '#f0fdf4' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Materials Total</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#166534' }}>${vm.materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── TOTALS + DEPOSIT CARDS ─────────────────────────── */}
      {showPrices && (
        <div style={{ display: 'grid', gridTemplateColumns: isEstimate && totals.depositPercent > 0 && opts.showDeposit ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ ...card(), padding: '22px 24px' }}>
            <div style={cardSectionLabel}>Summary</div>
            {/* Subtotal — emphasized when discount exists */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: totals.discountAmount > 0 ? '10px 0 8px' : '6px 0', fontSize: totals.discountAmount > 0 ? 15 : 13, color: DARK, borderBottom: '1px solid #f1f5f9', fontWeight: totals.discountAmount > 0 ? 700 : 400 }}>
              <span>{totals.discountAmount > 0 ? 'Original Price' : 'Subtotal'}</span>
              <span>${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {/* Discount — red with savings label */}
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#dc2626', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Your Savings
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 6px', color: '#b91c1c' }}>
                    {totals.discountType === 'percent' ? `${totals.discountValue}% OFF` : 'DISCOUNT'}
                  </span>
                </span>
                <span>−${totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Tax */}
            {totals.taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                <span>Tax ({totals.taxRate}%)</span>
                <span>${totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Contingency — only if client-visible and amount > 0 */}
            {ct.showContingencyToClient && ct.contingencyAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#92400e', borderBottom: '1px solid #fef3c7', background: '#fffbeb', margin: '2px -4px', padding: '6px 4px', borderRadius: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>
                    Contingency Reserve
                    {ct.contingencyType === 'percent' && <span style={{ marginLeft: 4, fontSize: 10, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 5px' }}>{ct.contingencyValue}%</span>}
                  </span>
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>${ct.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 9, color: '#b45309', fontStyle: 'italic' }}>not included in total</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 6, borderTop: `3px solid ${DARK}` }}>
              <span style={{ fontWeight: 800, color: DARK, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Project Investment</span>
              <span style={{ fontWeight: 900, color: DARK, fontSize: 22 }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {isEstimate && totals.depositPercent > 0 && opts.showDeposit && (
            <div style={{ ...card(), padding: '22px 24px', background: '#dbeafe', border: `1.5px solid ${ACCENT}` }}>
              <div style={{ ...cardSectionLabel, color: ACCENT }}>Payment Schedule</div>
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

      {/* ─── UNCERTAINTY NOTE CARD ──────────────────────────── */}
      {text.uncertaintyNote && (
        <div style={{ ...card(), padding: '18px 24px', marginBottom: 20, borderLeft: `4px solid #f59e0b`, background: '#fffbeb' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Project Uncertainty Notice</div>
          <p style={{ color: '#78350f', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{text.uncertaintyNote}</p>
        </div>
      )}

      {/* ─── NOTES CARD ─────────────────────────────────────── */}
      {opts.showNotes && text.notes && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20, borderLeft: `4px solid ${ACCENT}` }}>
          <div style={cardSectionLabel}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── SCOPE SUMMARY + ASSUMPTIONS CARD ───────────────── */}
      {(text.scopeSummary || text.assumptions) && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          {text.scopeSummary && <ScopeSummarySection scopeSummary={text.scopeSummary} font={FONT} dark={DARK} muted={MUTED} sectionLabelStyle={sectionLabel} />}
          {text.assumptions && <AssumptionsSection assumptions={text.assumptions} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />}
          {text.includedScopeBullets?.length > 0 && <WhatsIncludedSection bullets={text.includedScopeBullets} font={FONT} dark={DARK} muted={MUTED} border={BORDER} sectionLabelStyle={sectionLabel} />}
        </div>
      )}

      {/* ─── EXCLUSIONS + WARRANTY + TIMELINE CARD ──────────── */}
      {(text.exclusions || text.warrantyTerms || project.startDate || project.endDate) && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          {text.exclusions && <ExclusionsSection exclusions={text.exclusions} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />}
          {text.warrantyTerms && <WarrantySection warrantyTerms={text.warrantyTerms} font={FONT} muted="#475569" sectionLabelStyle={sectionLabel} accentColor={ACCENT} />}
          {(project.startDate || project.endDate) && <TimelineSection
            startDate={project.startDate} endDate={project.endDate}
            font={FONT} dark={DARK} muted={MUTED} border={BORDER}
            sectionLabelStyle={sectionLabel}
          />}
        </div>
      )}

      {/* ─── PAYMENT TERMS CARD ──────────────────────────────── */}
      {opts.showTerms && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          <PaymentTermsBullets
            paymentTerms={text.paymentTerms}
            depositPercent={totals.depositPercent}
            depositAmount={totals.depositAmount}
            total={totals.total}
            font={FONT} muted="#475569"
            sectionLabelStyle={sectionLabel}
          />
          {/* Change Request Policy */}
          {text.changeRequestPolicy && (
            <div style={{ marginTop: 4 }}>
              <ChangeRequestSection changeRequestPolicy={text.changeRequestPolicy} font={FONT} muted="#475569" sectionLabelStyle={sectionLabel} accentColor={ACCENT} />
            </div>
          )}
          {/* Legal terms */}
          {text.legalTerms && (
            <div style={{ marginTop: 4 }}>
              <div style={sectionLabel}>Terms & Conditions</div>
              <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.legalTerms}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── PAYMENT METHODS CARD ──────────────────────────── */}
      {company.paymentMethods && company.paymentMethods.trim() && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          <div style={sectionLabel}>Payment Methods</div>
          <PaymentMethodsSection
            paymentMethods={company.paymentMethods}
            sectionLabelStyle={{ display: 'none' }}
            textStyle={{ color: '#475569', fontSize: 13, lineHeight: 1.7 }}
            containerStyle={{}}
          />
        </div>
      )}

      {/* ─── INCLUDED DOCUMENTS CARD ─────────────────────────── */}
      {vm.clientAttachments && vm.clientAttachments.length > 0 && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          <DocumentAttachmentsSection
            attachments={vm.clientAttachments}
            font={FONT}
            sectionLabelStyle={sectionLabel}
            accentColor={ACCENT}
          />
        </div>
      )}

      {/* ─── CLIENT ACCEPTANCE CARD ──────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ ...card(), padding: '24px 32px', marginBottom: 20 }}>
          <AcceptanceSection
            companyName={company.name} clientName={client.name}
            font={FONT} dark={DARK} muted="#475569" border={BORDER}
            sectionLabelStyle={sectionLabel} accentColor={ACCENT}
          />
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