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
 * FieldClassicTemplate — Contractor field-style compact header with professional layout.
 * Design: Company left | doc info/total right on compact header → client|project → services → materials → totals → sections → acceptance → footer
 * Font: Inter, sans-serif. Colors: gray/charcoal. Clean, practical, contractor-friendly.
 */

const P = 40; // horizontal padding
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#1f2937';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const LIGHT_BG = '#f9fafb';
const ACCENT = '#3b82f6';

const sectionLabel = { fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${BORDER}` };

export default function FieldClassicTemplate({ vm }) {
  const { meta, company, client, project, visibility: opts, groups, totals, text, contingency, columns: lineCols, termsArray } = vm;
  const ct = contingency || {};
  const { isWorkOrder, isEstimate, showPrices } = opts;

  return (
    <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.55, background: 'white', color: DARK, minWidth: 640 }}>

      {/* ─── COMPACT HEADER (Field/Contractor Style) ─────────────────── */}
      <div style={{ padding: `24px ${P}px 20px`, borderBottom: `3px solid ${ACCENT}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, alignItems: 'flex-start' }}>
          {/* LEFT: Company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {opts.showBusinessLogo && <CompanyLogoBlock logoUrl={company.logoUrl} size={72} borderColor={ACCENT} bgColor="white" />}
              <div style={{ flex: 1 }}>
                {opts.showBusinessName && <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', color: DARK }}>{company.name}</div>}
                {opts.showBusinessAddress && (
                  <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.7, marginTop: 4 }}>
                    {company.address && <div>{company.address}</div>}
                    {company.email && <div>{company.email}</div>}
                    {company.phone && <div>{company.phone}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Estimate info + Total */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: 6 }}>
              {meta.documentTypeLabel}
            </div>
            {opts.showEstimateNumber && (
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', color: DARK, marginBottom: 8 }}>
                #{meta.documentNumber || '—'}
              </div>
            )}
            {showPrices && (
              <div style={{ background: LIGHT_BG, padding: '10px 12px', borderRadius: 4, marginTop: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 3 }}>Total</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: DARK }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            )}
            {opts.showDocumentDate && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>{meta.today}</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CLIENT + PROJECT ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: `18px ${P}px`, borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 8 }}>Bill To</div>
          {opts.showCustomerName && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: DARK }}>{client.name}</div>}
          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
            {client.address && <div>{client.address}</div>}
            {client.email && <div>{client.email}</div>}
            {client.phone && <div>{client.phone}</div>}
          </div>
        </div>
        <div style={{ padding: `18px ${P}px` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 8 }}>Project Details</div>
          {opts.showEstimateName && project.title && <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: DARK }}>{project.title}</div>}
          <FlexibleDocDates
            mode="block"
            docDate={meta.today}
            startDate={project.startDate}
            endDate={project.endDate}
            showDocumentDate={false}
            showStartDate={opts.showProjectStartDate}
            showEndDate={opts.showProjectEndDate}
            font={FONT}
            textStyle={{ fontSize: 11, color: MUTED }}
          />
          {opts.showTechnicianName && project.assignedTo && (
            <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginRight: 5 }}>Assigned:</span>{project.assignedTo}
            </div>
          )}
        </div>
      </div>

      {/* ─── LINE ITEMS (Services) ────────────────────────────────── */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ padding: `18px ${P}px 0` }}>
          {groups.map((group, gi) => {
            const showGroupHeader = group.name && groups.length > 1;
            return (
              <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 6 }}>
                {showGroupHeader && (
                  <div style={{ background: DARK, color: 'white', fontWeight: 700, fontSize: 10, padding: '6px 12px', borderRadius: '4px 4px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {group.name}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: LIGHT_BG }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 50, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 50, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 90, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 100, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {lineCols.description && <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: DARK, fontSize: 12 }}>{item.service_name}</div>
                          {item.description && <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>{item.unit}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: DARK, fontSize: 11 }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MATERIALS ────────────────────────────────────────────── */}
      {opts.showMaterials && vm.materials && vm.materials.length > 0 && (
        <div style={{ padding: `18px ${P}px 0` }}>
          <div style={{ background: '#059669', color: 'white', fontWeight: 700, fontSize: 10, padding: '6px 12px', borderRadius: '4px 4px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>Materials Included</span>
            {showPrices && <span style={{ fontSize: 10 }}>${vm.materialsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: LIGHT_BG }}>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}` }}>Material</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 50, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 50, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Unit</th>
                {showPrices && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 90, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Price</th>}
                {showPrices && <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 9, fontWeight: 600, color: MUTED, width: 100, textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>Amount</th>}
              </tr>
            </thead>
            <tbody>
              {vm.materials.map((m, idx) => (
                <tr key={m.id || idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600, color: DARK, fontSize: 12 }}>{m.name}</div>
                    {m.description && <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>{m.description}</div>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>{m.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>{m.unit}</td>
                  {showPrices && <td style={{ textAlign: 'right', padding: '8px 10px', color: MUTED, fontSize: 11 }}>${m.unit_price.toFixed(2)}</td>}
                  {showPrices && <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: DARK, fontSize: 11 }}>${m.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TOTALS ───────────────────────────────────────────────── */}
      {showPrices && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `16px ${P}px 20px` }}>
          <div style={{ width: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: DARK, borderBottom: `1px solid ${BORDER}` }}>
              <span>Subtotal</span>
              <span>${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: '#dc2626', borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>
                <span>Discount</span>
                <span>−${totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {totals.taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                <span>Tax ({totals.taxRate}%)</span>
                <span>${totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {ct.showContingencyToClient && ct.contingencyAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, color: '#92400e', borderBottom: `1px solid ${BORDER}` }}>
                <span>Contingency</span>
                <span>${ct.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4, borderTop: `2px solid ${DARK}` }}>
              <span style={{ fontWeight: 700, color: DARK, fontSize: 12, textTransform: 'uppercase' }}>Total</span>
              <span style={{ fontWeight: 900, color: DARK, fontSize: 18 }}>${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEPOSIT ──────────────────────────────────────────────── */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && showPrices && (
        <div style={{ margin: `0 ${P}px 16px`, padding: '12px 14px', background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 3 }}>Deposit Required to Start</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af' }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 400, color: '#3b82f6' }}>({totals.depositPercent}%)</span></div>
        </div>
      )}

      {/* ─── UNCERTAINTY NOTE ─────────────────────────────────────── */}
      {text.uncertaintyNote && (
        <div style={{ margin: `0 ${P}px 16px`, padding: '10px 12px', background: '#fefce8', border: `1px solid #fde68a`, borderRadius: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 3 }}>Uncertainty Notice</div>
          <p style={{ color: '#78350f', fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{text.uncertaintyNote}</p>
        </div>
      )}

      {/* ─── NOTES ────────────────────────────────────────────────── */}
      {opts.showNotes && text.notes && (
        <div style={{ padding: `0 ${P}px 14px`, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
          <div style={sectionLabel}>Notes</div>
          <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* ─── SCOPE SUMMARY ────────────────────────────────────────── */}
      {text.scopeSummary && (
        <div style={{ padding: `0 ${P}px` }}>
          <ScopeSummarySection scopeSummary={text.scopeSummary} font={FONT} dark={DARK} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── ASSUMPTIONS ──────────────────────────────────────────── */}
      {text.assumptions && (
        <div style={{ padding: `0 ${P}px` }}>
          <AssumptionsSection assumptions={text.assumptions} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── WHAT'S INCLUDED ──────────────────────────────────────── */}
      {text.includedScopeBullets?.length > 0 && (
        <div style={{ padding: `0 ${P}px` }}>
          <WhatsIncludedSection bullets={text.includedScopeBullets} font={FONT} dark={DARK} muted={MUTED} border={BORDER} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── EXCLUSIONS ───────────────────────────────────────────── */}
      {text.exclusions && (
        <div style={{ padding: `0 ${P}px` }}>
          <ExclusionsSection exclusions={text.exclusions} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── WARRANTY ─────────────────────────────────────────────── */}
      {text.warrantyTerms && (
        <div style={{ padding: `0 ${P}px` }}>
          <WarrantySection warrantyTerms={text.warrantyTerms} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── ESTIMATED TIMELINE ───────────────────────────────────── */}
      {(project.startDate || project.endDate) && (
        <div style={{ padding: `0 ${P}px` }}>
          <TimelineSection
            startDate={project.startDate} endDate={project.endDate}
            font={FONT} dark={DARK} muted={MUTED} border={BORDER}
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── PAYMENT TERMS ────────────────────────────────────────── */}
      {opts.showTerms && (
        <div style={{ padding: `0 ${P}px` }}>
          <PaymentTermsBullets
            paymentTerms={text.paymentTerms}
            depositPercent={totals.depositPercent}
            depositAmount={totals.depositAmount}
            total={totals.total}
            font={FONT} muted={MUTED}
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── PAYMENT METHODS ──────────────────────────────────────── */}
      {company.paymentMethods && company.paymentMethods.trim() && (
        <div style={{ padding: `0 ${P}px 14px` }}>
          <div style={sectionLabel}>Payment Methods</div>
          <PaymentMethodsSection
            paymentMethods={company.paymentMethods}
            sectionLabelStyle={{ display: 'none' }}
            textStyle={{ color: MUTED, fontSize: 11, lineHeight: 1.6 }}
            containerStyle={{}}
          />
        </div>
      )}

      {/* ─── CHANGE REQUEST POLICY ────────────────────────────────── */}
      {opts.showTerms && text.changeRequestPolicy && (
        <div style={{ padding: `0 ${P}px` }}>
          <ChangeRequestSection changeRequestPolicy={text.changeRequestPolicy} font={FONT} muted={MUTED} sectionLabelStyle={sectionLabel} />
        </div>
      )}

      {/* ─── LEGAL TERMS ──────────────────────────────────────────── */}
      {opts.showTerms && text.legalTerms && (
        <div style={{ padding: `0 ${P}px 14px`, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
          <div style={sectionLabel}>Terms & Conditions</div>
          <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{text.legalTerms}</p>
        </div>
      )}

      {/* ─── INCLUDED DOCUMENTS ───────────────────────────────────── */}
      {vm.clientAttachments && vm.clientAttachments.length > 0 && (
        <div style={{ padding: `0 ${P}px 14px`, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
          <DocumentAttachmentsSection
            attachments={vm.clientAttachments}
            font={FONT}
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── CLIENT ACCEPTANCE ────────────────────────────────────── */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ padding: `16px ${P}px 20px`, borderTop: `1px solid ${BORDER}` }}>
          <AcceptanceSection
            companyName={company.name} clientName={client.name}
            font={FONT} dark={DARK} muted={MUTED} border={BORDER}
            sectionLabelStyle={sectionLabel}
          />
        </div>
      )}

      {/* ─── FOOTER ───────────────────────────────────────────────── */}
      <div style={{ padding: `8px ${P}px`, borderTop: `1px solid ${BORDER}`, background: LIGHT_BG, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' }}>
        <span>{company.name}{company.license ? ` · License ${company.license}` : ''}</span>
        <span>{meta.today}</span>
      </div>
    </div>
  );
}