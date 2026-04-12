import React from 'react';
import DocumentHeader from '../documents/DocumentHeader';
import DocumentFooter from '../documents/DocumentFooter';
import DocumentSummary from '../documents/DocumentSummary';
import CompanyLogoBlock from '../documents/CompanyLogoBlock';
import FlexibleDocHeader from '../documents/FlexibleDocHeader';
import FlexibleDocClientProject from '../documents/FlexibleDocClientProject';
import useCompanyConfig from '@/hooks/useCompanyConfig';
import { buildEstimateDocumentViewModel } from '@/lib/buildEstimateDocumentViewModel';
import { getTemplateLayout } from '@/lib/templateLayouts';

/**
 * EstimateTemplateRenderer — Universal document renderer with 6 distinct templates
 *
 * ARCHITECTURE (Phase 11 — 100% CLOSED):
 * - buildEstimateDocumentViewModel() centralizes ALL domain/business prep
 * - Templates consume ONLY the view model (vm.*) — never raw estimate fields
 * - All child components (DocumentHeader, DocumentSummary, DocumentFooter)
 *   receive ONLY vm-derived props — zero raw `estimate` reads remain
 *
 * Templates:
 * 1. minimal  — Clean, sparse, B&W
 * 2. standard — Corporate, clean, balanced
 * 3. modern   — Contemporary, colored accents
 * 4. executive — Premium, serif, gold accents
 * 5. compact  — Space-efficient, sidebar layout
 * 6. pro      — Premium, cards, shadows, gradients
 */

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE CONFIG (visual styles — no domain logic)
// ═══════════════════════════════════════════════════════════════════════

const TEMPLATE_STYLES = {
  minimal: { font: 'Arial, sans-serif', fontSize: 11, padding: '40px' },
  standard: { font: 'Inter, Arial, sans-serif', fontSize: 13, padding: '52px', headerBg: '#0f172a' },
  modern: { font: 'system-ui, -apple-system, sans-serif', fontSize: 12, padding: '40px', accentColor: '#7c3aed' },
  executive: { font: 'Georgia, serif', fontSize: 12, padding: '50px', accentColor: '#d4a574' },
  compact: { font: 'Arial, sans-serif', fontSize: 12, sidebarWidth: '35%', sidebarBg: '#f0f0f0' },
  pro: { font: 'Inter, Arial, sans-serif', fontSize: 13, padding: '44px', accentColor: '#0f172a' },
};

export default function EstimateTemplateRenderer({ estimate, template = 'standard', options = {}, documentType = 'estimate' }) {
  const cc = useCompanyConfig();
  if (!estimate) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW MODEL — the single source of all render data
  // ═══════════════════════════════════════════════════════════════════════
  const vm = buildEstimateDocumentViewModel({
    estimate,
    companyConfig: cc,
    documentType,
    template,
    options,
  });
  if (!vm) return null;

  // Destructure for template convenience (pure aliases, no recomputation)
  const { meta, company, client, project, visibility: opts, groups, totals, text, columns: lineCols, termsArray } = vm;
  const { isWorkOrder, isInvoice, isEstimate, showPrices } = opts;

  // ═══════════════════════════════════════════════════════════════════════
  // LAYOUT CONFIG — structural decisions per template
  // ═══════════════════════════════════════════════════════════════════════
  const layout = getTemplateLayout(meta.template);

  // Props for FlexibleDocHeader
  const flexHeaderCompany = {
    name: company.name,
    tagline: company.tagline,
    address: company.address,
    email: company.email,
    phone: company.phone,
    logoUrl: company.logoUrl,
  };

  // Props for FlexibleDocClientProject
  const flexClient = { name: client.name, address: client.address, email: client.email, phone: client.phone };
  const flexProject = { title: project.title, startDate: project.startDate, endDate: project.endDate, hasProjectDates: project.hasProjectDates, assignedTo: project.assignedTo };

  // ═══════════════════════════════════════════════════════════════════════
  // SHARED CHILD PROPS — fully vm-driven, no raw estimate references
  // ═══════════════════════════════════════════════════════════════════════
  const headerProps = {
    documentNumber: meta.documentNumber,
    documentTypeLabel: meta.documentTypeLabel,
    status: meta.status,
    statusLabel: meta.statusLabel,
    statusStyle: meta.statusStyle,
    today: meta.today,
    expDate: meta.expirationDate,
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SHARED HELPERS for DocumentSummary props
  // ═══════════════════════════════════════════════════════════════════════
  const summaryProps = {
    documentType,
    showPrices,
    showDeposit: opts.showDeposit,
    total: totals.total,
    subtotal: totals.subtotal,
    depositPct: totals.depositPercent,
    depositAmount: totals.depositAmount,
    remaining: totals.remaining,
    isEstimate,
    discountAmount: totals.discountAmount,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: MINIMAL
  // ═══════════════════════════════════════════════════════════════════════
  const renderMinimalTemplate = () => {
    const minLayout = getTemplateLayout('minimal');
    return (
    <div style={{ fontFamily: minLayout.font, fontSize: 11, color: '#222', padding: '0', background: 'white', lineHeight: 1.6, maxWidth: 760 }}>

      {/* HEADER — layout-driven */}
      <FlexibleDocHeader layout={minLayout} company={flexHeaderCompany} meta={meta} />

      {/* CLIENT + PROJECT — layout-driven */}
      <FlexibleDocClientProject layout={minLayout} client={flexClient} project={flexProject} meta={meta} showProjectDates={opts.showProjectDates} />

      {/* Project title */}
      {project.title && (
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 16, padding: '0 44px' }}>{project.title}</div>
      )}

      {/* LINE ITEMS */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ marginBottom: 20, padding: '0 44px' }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
              {group.name && (
                <div style={{ fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #222', paddingBottom: 3, marginBottom: 6, marginTop: gi > 0 ? 12 : 0 }}>{group.name}</div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #bbb', background: '#f7f7f7' }}>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 'bold' }}>Service</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 'bold', width: 50 }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 'bold', width: 50 }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 'bold', width: 90 }}>Unit Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, fontWeight: 'bold', width: 90 }}>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                      {lineCols.description && (
                        <td style={{ padding: '7px 8px', fontSize: 11 }}>
                          <div style={{ fontWeight: '600' }}>{item.service_name}</div>
                          {item.description && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{item.description}</div>}
                        </td>
                      )}
                      {lineCols.quantity && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11 }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11 }}>{item.unit}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11, fontWeight: 'bold' }}>${item.line_total.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* TOTALS */}
      <DocumentSummary {...summaryProps} variant="minimal" style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #bbb' }} />

      {/* DEPOSIT CALLOUT */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 3 }}>DEPOSIT REQUIRED TO START</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1e40af' }}>
            ${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({totals.depositPercent}%)
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>
            Remaining balance of ${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} due upon completion.
          </div>
        </div>
      )}

      {/* NOTES */}
      {text.notes && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
          <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Notes for Client</div>
          <div style={{ fontSize: 11, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text.notes}</div>
        </div>
      )}

      {/* TERMS */}
      {opts.showTerms && termsArray.map(t => (
        <div key={t.key} style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 4 }}>{t.label}</div>
          <div style={{ fontSize: 10, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{t.value}</div>
        </div>
      ))}

      {/* SIGNATURES */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ borderBottom: '1px solid #555', paddingBottom: 32, marginBottom: 6 }} />
            <div style={{ fontSize: 10, color: '#888' }}>Authorized Signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid #555', paddingBottom: 32, marginBottom: 6 }} />
            <div style={{ fontSize: 10, color: '#888' }}>Customer Signature & Date</div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 32, paddingTop: 10, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa', padding: '10px 44px' }}>
        <span>{company.name} · {company.city}</span>
        <span>{meta.today}</span>
      </div>
    </div>
  );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: STANDARD
  // ═══════════════════════════════════════════════════════════════════════
  const renderStandardTemplate = () => (
    <div id="estimate-document" style={{ fontFamily: layout.font, fontSize: 13, lineHeight: 1.5, background: 'white', color: '#0f172a', minWidth: 640 }}>
      {/* HEADER — layout-driven */}
      <FlexibleDocHeader layout={layout} company={flexHeaderCompany} meta={meta} />

      {/* BILL TO + PROJECT — layout-driven */}
      <FlexibleDocClientProject layout={layout} client={flexClient} project={flexProject} meta={meta} showProjectDates={opts.showProjectDates} />

      {/* LINE ITEMS */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ padding: '28px 44px 0' }}>
          {groups.map((group, gi) => {
            const showGroupHeader = group.name && groups.length > 1;
            const th = { textAlign: 'right', padding: '9px 12px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0' };
            const thLeft = { ...th, textAlign: 'left' };
            const td = { padding: '11px 12px', textAlign: 'right', color: '#64748b', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
            const tdLeft = { ...td, textAlign: 'left' };

            return (
              <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 28 : 8 }}>
                {showGroupHeader && (
                  <div style={{ background: '#1e293b', color: 'white', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: '6px 6px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{group.name}</span>
                    {lineCols.total && <span style={{ color: '#94a3b8', fontSize: 11 }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {lineCols.description && <th style={thLeft}>Description</th>}
                      {lineCols.quantity && <th style={{ ...th, width: 60 }}>Qty</th>}
                      {lineCols.unit && <th style={{ ...th, width: 60 }}>Unit</th>}
                      {lineCols.price && <th style={{ ...th, width: 110 }}>Unit Price</th>}
                      {lineCols.total && <th style={{ ...th, width: 120 }}>Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).length === 0 && (
                      <tr><td colSpan={Object.values(lineCols).filter(Boolean).length} style={{ ...tdLeft, color: '#94a3b8', fontStyle: 'italic', padding: '20px 12px' }}>No items</td></tr>
                    )}
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        {lineCols.description && <td style={tdLeft}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.service_name}</div>
                          {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={td}>{parseFloat(item.quantity) % 1 === 0 ? parseInt(item.quantity) : item.quantity}</td>}
                        {lineCols.unit && <td style={td}>{item.unit}</td>}
                        {lineCols.price && <td style={td}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                    {showGroupHeader && lineCols.total && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={Object.values(lineCols).filter(Boolean).length - 1} style={{ ...tdLeft, fontWeight: 600, color: '#334155', fontSize: 12, padding: '8px 12px', borderBottom: 'none' }}>Subtotal — {group.name}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#334155', borderBottom: 'none', padding: '8px 12px' }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* TOTALS */}
      <DocumentSummary {...summaryProps} variant="standard" />

      {/* DEPOSIT CALLOUT */}
      {isEstimate && totals.depositPercent > 0 && opts.showDeposit && (
        <div style={{ margin: '0 52px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Deposit Required to Start Work</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 'normal', color: '#3b82f6' }}>({totals.depositPercent}%)</span></div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Remaining balance: ${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} — due upon project completion.</div>
        </div>
      )}

      {/* NOTES */}
      {text.notes && (
        <div style={{ padding: '20px 52px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Notes for Client</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
        </div>
      )}

      {/* TERMS */}
      {opts.showTerms && termsArray.map(t => (
        <div key={t.key} style={{ margin: '0 52px', borderTop: '1px solid #e2e8f0', padding: '20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t.label}</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{t.value}</p>
        </div>
      ))}

      {/* SIGNATURES */}
      {opts.showSignatures && !isWorkOrder && (
        <div style={{ margin: '0 52px', borderTop: '1px solid #e2e8f0', padding: '32px 0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
          <div>
            <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 40, marginBottom: 10 }} />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Authorized Signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 40, marginBottom: 10 }} />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Customer Signature &amp; Date</div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <DocumentFooter
        today={meta.today}
        companyName={company.name}
        licenseNumber={company.license}
        variant="standard"
        showDate={false}
        showCompany={true}
        showLicense={true}
      />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: MODERN
  // ═══════════════════════════════════════════════════════════════════════
  const renderModernTemplate = () => {
    const modernLayout = getTemplateLayout('modern');
    return (
      <div style={{ fontFamily: modernLayout.font, fontSize: 12, color: '#1f2937', background: 'white', padding: '0' }}>
        {/* Header — layout-driven */}
        <FlexibleDocHeader layout={modernLayout} company={flexHeaderCompany} meta={meta} />

        {/* Client + Project — layout-driven */}
        <FlexibleDocClientProject layout={modernLayout} client={flexClient} project={flexProject} meta={meta} showProjectDates={opts.showProjectDates} />

        {/* Amount Due callout */}
        {showPrices && (
          <div style={{ padding: '0 44px 24px' }}>
            <div style={{ background: '#f3f4f6', padding: '16px 20px', borderRadius: 8, display: 'inline-block' }}>
              <div style={{ fontSize: 10, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Amount Due</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: modernLayout.accentColor }}>${totals.total.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Notes */}
        {text.notes && (
          <div style={{ background: '#f0f9ff', border: `1px solid ${modernLayout.accentColor}`, borderRadius: 8, padding: 15, marginBottom: 30, margin: '0 44px 30px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{text.notes}</div>
          </div>
        )}

        {/* Line items */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            {groups.map((group, gi) => (
              <div key={group.id || gi} style={{ marginBottom: 20 }}>
                {group.name && <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${modernLayout.accentColor}` }}>{group.name}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#6b7280' }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'center', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#6b7280', width: 60 }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'center', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#6b7280', width: 40 }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#6b7280', width: 80 }}>Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#6b7280', width: 100 }}>Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {lineCols.description && <td style={{ padding: '10px', fontSize: 12 }}>
                          <div style={{ fontWeight: '600', color: '#111' }}>{item.service_name}</div>
                          {item.description && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.unit}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: modernLayout.accentColor }}>${item.line_total.toFixed(2)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <DocumentSummary {...summaryProps} variant="modern" style={{ marginBottom: 30 }} />

        {/* Footer */}
        <DocumentFooter today={meta.today} companyName={company.name} licenseNumber="" variant="modern" showDate={true} showCompany={true} showLicense={false} style={{ borderTop: `2px solid ${modernLayout.accentColor}`, paddingTop: 20, marginTop: 20, textAlign: 'center' }} />
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: EXECUTIVE
  // ═══════════════════════════════════════════════════════════════════════
  const renderExecutiveTemplate = () => {
    const execLayout = getTemplateLayout('executive');
    return (
    <div style={{ fontFamily: execLayout.font, fontSize: 12, color: '#2d2d2d', background: 'white', padding: '0' }}>
      {/* Header — layout-driven (split-premium) */}
      <FlexibleDocHeader layout={execLayout} company={flexHeaderCompany} meta={meta} />

      {/* Client + Project — layout-driven */}
      <FlexibleDocClientProject layout={execLayout} client={flexClient} project={flexProject} meta={meta} showProjectDates={opts.showProjectDates} />

      {/* Total Amount callout */}
      {showPrices && (
        <div style={{ padding: '0 44px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 15, borderTop: `1px solid ${execLayout.accentColor}`, fontSize: 13 }}>
            <span style={{ fontWeight: 'bold', color: execLayout.accentColor }}>Total Amount:</span>
            <span style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: 16 }}>${totals.total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Title */}
      {project.title && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>{project.title}</div>
        </div>
      )}

      {/* Notes */}
      {text.notes && (
        <div style={{ marginBottom: 30, padding: '20px', margin: '0 44px', background: '#faf8f3', borderLeft: `4px solid ${execLayout.accentColor}` }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#1a1a1a' }}>Summary</div>
          <div style={{ fontSize: 11, lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>{text.notes}</div>
        </div>
      )}

      {/* Line items */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi}>
              {group.name && <div style={{ fontWeight: 'bold', fontSize: 13, color: '#1a1a1a', marginBottom: 12, marginTop: gi > 0 ? 20 : 0 }}>{group.name}</div>}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #d4a574' }}>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#1a1a1a' }}>Service Description</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'center', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#1a1a1a', width: 60 }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'center', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#1a1a1a', width: 40 }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#1a1a1a', width: 90 }}>Unit Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '10px', fontSize: 10, fontWeight: 'bold', color: '#1a1a1a', width: 100 }}>Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {lineCols.description && <td style={{ padding: '10px', fontSize: 11 }}>
                        <div style={{ fontWeight: 'bold', color: '#1a1a1a' }}>{item.service_name}</div>
                        {item.description && <div style={{ fontSize: 10, color: '#7a7a7a', marginTop: 3 }}>{item.description}</div>}
                      </td>}
                      {lineCols.quantity && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.unit}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: '#d4a574' }}>${item.line_total.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <DocumentSummary {...summaryProps} variant="executive" style={{ marginBottom: 40 }} />

      {/* Footer */}
      <DocumentFooter today={meta.today} companyName={company.name} licenseNumber="" variant="executive" showDate={true} showCompany={false} showLicense={false} style={{ paddingTop: 20, borderTop: `2px solid ${execLayout.accentColor}`, textAlign: 'center', marginTop: 40 }} />
    </div>
  );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: COMPACT
  // ═══════════════════════════════════════════════════════════════════════
  const renderCompactTemplate = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#222', background: 'white', display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '35%', background: '#f0f0f0', padding: '30px', borderRight: '1px solid #ddd' }}>
        <DocumentHeader {...headerProps} today={null} expDate={null} showStatus={false} variant="compact" />

        <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{client.name}</div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 15 }}>
          {client.address && <div>{client.address}</div>}
          {client.email && <div>{client.email}</div>}
        </div>

        {project.title && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 5 }}>Project</div>
            <div style={{ marginBottom: 15 }}>{project.title}</div>
          </div>
        )}

        <div style={{ background: 'white', padding: '12px', borderRadius: 4, marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>SUMMARY</div>
          <DocumentSummary {...summaryProps} variant="compact" style={{}} />
        </div>

        {meta.status && (
          <div style={{ marginTop: 20, padding: '8px', background: meta.statusStyle.bg, color: meta.statusStyle.color, borderRadius: 4, textAlign: 'center', fontSize: 10, fontWeight: 'bold' }}>
            {meta.statusLabel}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '30px' }}>
        {text.notes && (
          <div style={{ marginBottom: 20, padding: '15px', background: '#f9f9f9', borderLeft: '3px solid #0066cc' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{text.notes}</div>
          </div>
        )}

        {/* Line items */}
        {opts.showBreakdown && groups.length > 0 && (
          <div>
            {groups.map((group, gi) => (
              <div key={group.id || gi} style={{ marginBottom: 20 }}>
                {group.name && <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>{group.name}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #999' }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '6px', fontSize: 10, fontWeight: 'bold' }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'center', padding: '6px', fontSize: 10, fontWeight: 'bold', width: 50 }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'center', padding: '6px', fontSize: 10, fontWeight: 'bold', width: 40 }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '6px', fontSize: 10, fontWeight: 'bold', width: 70 }}>Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '6px', fontSize: 10, fontWeight: 'bold', width: 80 }}>Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #ddd' }}>
                        {lineCols.description && <td style={{ padding: '6px', fontSize: 11 }}>
                          <div style={{ fontWeight: 'bold' }}>{item.service_name}</div>
                          {item.description && <div style={{ fontSize: 10, color: '#666' }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={{ textAlign: 'center', padding: '6px', fontSize: 11 }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '6px', fontSize: 11 }}>{item.unit}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11 }}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11, fontWeight: 'bold' }}>${item.line_total.toFixed(2)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Terms */}
        {opts.showTerms && text.paymentTerms && (
          <div style={{ marginTop: 20, padding: '12px', background: '#f9f9f9', fontSize: 11 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Payment Terms</div>
            <div>{text.paymentTerms}</div>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE: PRO
  // ═══════════════════════════════════════════════════════════════════════
  const renderProTemplate = () => {
    const proLayout = getTemplateLayout('pro');
    const PRO_ACCENT = proLayout.accentColor;
    const PRO_ACCENT_LIGHT = '#dbeafe';
    const PRO_DARK = '#0f172a';

    const card = (extra = {}) => ({
      background: 'white', borderRadius: 10, border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(15,23,42,0.07)', overflow: 'hidden', ...extra,
    });

    const label = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 };

    return (
      <div style={{ fontFamily: proLayout.font, fontSize: 13, lineHeight: 1.55, background: '#f1f5f9', color: PRO_DARK, minWidth: 680, padding: '0' }}>

        {/* HEADER — layout-driven (inside a card) */}
        <div style={{ padding: '40px 40px 0' }}>
          <div style={{ ...card(), background: PRO_DARK, color: 'white', overflow: 'hidden', marginBottom: 24 }}>
            <FlexibleDocHeader layout={proLayout} company={flexHeaderCompany} meta={meta} />
          </div>
        </div>

        {/* CLIENT + PROJECT — layout-driven (cards mode) */}
        <FlexibleDocClientProject layout={proLayout} client={flexClient} project={flexProject} meta={meta} showProjectDates={opts.showProjectDates} />

        {/* SERVICES TABLE */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ ...card(), marginBottom: 24 }}>
            {groups.map((group, gi) => (
              <div key={group.id || gi}>
                {group.name && (
                  <div style={{ background: PRO_DARK, color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{group.name}</span>
                    {lineCols.total && <span style={{ fontSize: 12, color: '#94a3b8' }}>${group.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '11px 24px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'center', padding: '11px 12px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', width: 60 }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'center', padding: '11px 12px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', width: 60 }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '11px 20px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', width: 110 }}>Unit Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '11px 24px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', width: 120 }}>Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        {lineCols.description && (
                          <td style={{ padding: '13px 24px' }}>
                            <div style={{ fontWeight: 600, color: PRO_DARK, fontSize: 13 }}>{item.service_name}</div>
                            {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>}
                          </td>
                        )}
                        {lineCols.quantity && <td style={{ textAlign: 'center', padding: '13px 12px', color: '#475569', fontSize: 13 }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '13px 12px', color: '#475569', fontSize: 12 }}>{item.unit}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '13px 20px', color: '#475569', fontSize: 13 }}>${item.unit_price.toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '13px 24px', color: PRO_DARK, fontSize: 13, fontWeight: 700 }}>${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* TOTALS + DEPOSIT */}
        {showPrices && (
          <div style={{ display: 'grid', gridTemplateColumns: isEstimate && totals.depositPercent > 0 && opts.showDeposit ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ ...card(), padding: '22px 24px' }}>
              <div style={label}>Financial Summary</div>
              {[
                { show: true, l: 'Subtotal', v: totals.subtotal },
                { show: totals.discountAmount > 0, l: 'Discount', v: -totals.discountAmount, color: '#dc2626' },
                { show: totals.taxRate > 0, l: `Tax (${totals.taxRate}%)`, v: totals.taxAmount },
                { show: true, l: 'TOTAL', v: totals.total, bold: true, big: true },
              ].filter(r => r.show).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: row.bold ? `2px solid ${PRO_ACCENT_LIGHT}` : '1px solid #f1f5f9', fontSize: row.big ? 16 : 13, fontWeight: row.bold ? 800 : 400, color: row.color || (row.bold ? PRO_DARK : '#475569') }}>
                  <span>{row.l}</span>
                  <span>${Math.abs(row.v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            {isEstimate && totals.depositPercent > 0 && opts.showDeposit && (
              <div style={{ ...card(), padding: '22px 24px', background: PRO_ACCENT_LIGHT, border: `1.5px solid ${PRO_ACCENT}` }}>
                <div style={{ ...label, color: PRO_ACCENT }}>Payment Schedule</div>
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${PRO_ACCENT}30` }}>
                  <div style={{ fontSize: 11, color: PRO_ACCENT, marginBottom: 4, fontWeight: 600 }}>Deposit to Start Work</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: PRO_ACCENT, lineHeight: 1 }}>${totals.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3 }}>{totals.depositPercent}% of total</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 3, fontWeight: 600 }}>Remaining Upon Completion</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: PRO_DARK }}>${totals.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TERMS */}
        {opts.showTerms && termsArray.length > 0 && (
          <div style={{ ...card(), padding: '22px 24px', marginBottom: 24 }}>
            {termsArray.map((t, i) => (
              <div key={t.key} style={{ paddingBottom: i < termsArray.length - 1 ? 14 : 0, marginBottom: i < termsArray.length - 1 ? 14 : 0, borderBottom: i < termsArray.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={label}>{t.label}</div>
                <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{t.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {text.notes && (
          <div style={{ ...card(), padding: '22px 24px', marginBottom: 24, borderLeft: `4px solid ${PRO_ACCENT}` }}>
            <div style={label}>Notes for Client</div>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{text.notes}</p>
          </div>
        )}

        {/* SIGNATURES */}
        {opts.showSignatures && !isWorkOrder && (
          <div style={{ ...card(), padding: '28px 36px', marginBottom: 24 }}>
            <div style={label}>Authorization & Signatures</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 8 }}>
              {[{ title: 'Contractor Signature', sub: `${company.name} · Authorized Representative` }, { title: 'Client Signature & Date', sub: client.name || 'Client' }].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 52, borderBottom: `2px solid ${PRO_DARK}`, marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: PRO_DARK }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '14px 0 0', borderTop: '1px solid #e2e8f0', opacity: 0.35 }}>
          <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>
            {company.name} &nbsp;·&nbsp; {company.address} &nbsp;·&nbsp; License {company.license} &nbsp;·&nbsp; {meta.today}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER SELECTION
  // ═══════════════════════════════════════════════════════════════════════
  switch (meta.template) {
    case 'minimal':   return renderMinimalTemplate();
    case 'standard':  return renderStandardTemplate();
    case 'modern':    return renderModernTemplate();
    case 'executive': return renderExecutiveTemplate();
    case 'compact':   return renderCompactTemplate();
    case 'pro':       return renderProTemplate();
    default:          return renderStandardTemplate();
  }
}