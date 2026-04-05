import React from 'react';
import DocumentHeader from '../documents/DocumentHeader';
import DocumentFooter from '../documents/DocumentFooter';
import DocumentSummary from '../documents/DocumentSummary';

/**
 * EstimateTemplateRenderer — Universal document renderer with 6 distinct templates
 * 
 * ARCHITECTURE:
 * - Common setup (data resolution, calculations, column logic)
 * - Template config (visual styles per template)
 * - Render helpers (reusable sections: header, client, project, items, summary, footer)
 * - 6 Template functions (each = composition of helpers with specific config)
 * 
 * Templates:
 * 1. minimal - Clean, sparse, B&W, minimal styling
 * 2. standard - Corporate, clean, balanced
 * 3. modern - Contemporary, colored accents, rounded
 * 4. executive - Premium, elegant, serif, gold accents
 * 5. compact - Space-efficient, sidebar layout
 * 6. pro - Premium, cards, shadows, gradients
 * 
 * Document Types:
 * - estimate: Shows prices, deposit, terms, signatures
 * - invoice: Shows prices, tax, discount (no deposit)
 * - workorder: Hides all prices, focuses on tasks and execution
 */

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

const getLineItemColumns = (documentType) => {
  if (documentType === 'workorder') {
    return { description: true, quantity: true, unit: true, price: false, total: false };
  }
  return { description: true, quantity: true, unit: true, price: true, total: true };
};

const hasProjectDates = (startDate, endDate) => Boolean(startDate || endDate);

const formatDate = (dateStr) => dateStr
  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : null;

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE CONFIG (visual styles per template)
// ═══════════════════════════════════════════════════════════════════════

const TEMPLATE_STYLES = {
  minimal: {
    font: 'Arial, sans-serif',
    fontSize: 11,
    padding: '40px',
    headerStyle: { marginBottom: 30 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
    headerNum: { fontSize: 14, color: '#666' },
    tableHeader: { background: 'transparent', border: '1px solid #000' },
    tableRow: { border: '1px solid #ddd' },
    blockBg: '#f5f5f5',
    blockBorder: 'none',
  },
  standard: {
    font: 'Inter, Arial, sans-serif',
    fontSize: 13,
    padding: '52px',
    headerBg: '#0f172a',
    headerColor: 'white',
    tableHeader: { background: '#f8fafc', border: '2px solid #e2e8f0' },
    tableRow: { border: '1px solid #f1f5f9' },
    blockBg: '#f8fafc',
    blockBorder: '1px solid #e2e8f0',
    accent: '#38bdf8',
  },
  modern: {
    font: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    padding: '40px',
    accentColor: '#7c3aed',
    tableHeader: { background: '#f9fafb', border: 'none' },
    tableRow: { borderBottom: '1px solid #e5e7eb' },
    blockBg: '#f0f9ff',
    blockBorder: '1px solid #7c3aed',
    rounded: 8,
  },
  executive: {
    font: 'Georgia, serif',
    fontSize: 12,
    padding: '50px',
    color: '#2d2d2d',
    accentColor: '#d4a574',
    tableHeader: { background: '#f5f5f5', borderBottom: '2px solid #d4a574' },
    tableRow: { borderBottom: '1px solid #e0e0e0' },
    blockBg: '#faf8f3',
    blockBorder: '4px solid #d4a574',
  },
  compact: {
    font: 'Arial, sans-serif',
    fontSize: 12,
    layout: 'flex',
    sidebarWidth: '35%',
    sidebarBg: '#f0f0f0',
    mainFlex: 1,
    tableHeader: { background: '#f0f0f0', borderBottom: '2px solid #999' },
    tableRow: { borderBottom: '1px solid #ddd' },
  },
  pro: {
    font: 'Inter, Arial, sans-serif',
    fontSize: 13,
    padding: '44px',
    accentColor: '#0f172a',
    tableHeader: { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    tableRow: { borderBottom: '1px solid #f1f5f9' },
    blockBg: 'white',
    blockBorder: '1px solid #e2e8f0',
    blockShadow: '0 4px 6px rgba(0,0,0,0.07)',
    rounded: 12,
  },
};

export default function EstimateTemplateRenderer({ estimate, template = 'standard', options = {}, documentType = 'estimate' }) {
  if (!estimate) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // COMMON SETUP (shared by all templates)
  // ═══════════════════════════════════════════════════════════════════════

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    hideInternalNotes: options.hideInternalNotes !== false,
  };

  const isWorkOrder = documentType === 'workorder';
  const isInvoice = documentType === 'invoice';
  const isEstimate = documentType === 'estimate';
  const showPrices = isWorkOrder ? false : opts.showPrices;

  const groups = estimate.groups?.length
    ? estimate.groups
    : estimate.line_items?.length
      ? [{
        id: 'legacy',
        name: null,
        items: estimate.line_items.map(li => ({
          id: li.id,
          service_name: li.name || li.service_name || '',
          description: li.description || '',
          quantity: li.quantity || 1,
          unit: li.unit || 'ea',
          unit_price: li.unit_price || 0,
          line_total: li.total_price || li.line_total || 0,
        })),
      }]
      : [];

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expDate = formatDate(estimate.expiration_date);
  const startDate = formatDate(estimate.project_start_date);
  const endDate = formatDate(estimate.project_end_date);

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  const statusColors = {
    approved: { bg: '#166534', color: '#bbf7d0' },
    declined: { bg: '#7f1d1d', color: '#fecaca' },
    sent: { bg: '#1e3a5f', color: '#93c5fd' },
    draft: { bg: '#1e293b', color: '#94a3b8' },
    converted: { bg: '#14532d', color: '#bbf7d0' },
  };
  const statusStyle = statusColors[estimate.status] || statusColors.draft;

  const docTypeLabel = isWorkOrder ? 'WORK ORDER' : isInvoice ? 'INVOICE' : 'ESTIMATE';

  const lineCols = getLineItemColumns(documentType);
  const hasProjectDates_ = hasProjectDates(startDate, endDate);

  const safeTemplate = ['minimal', 'standard', 'modern', 'executive', 'compact', 'pro'].includes(template) ? template : 'standard';

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER HELPERS (reusable sections)
  // ═══════════════════════════════════════════════════════════════════════

  const renderMinimalTemplate = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', padding: '40px', background: 'white', lineHeight: 1.6 }}>
      {/* Header */}
      <DocumentHeader
        estimate={estimate}
        documentType={documentType}
        today={today}
        expDate={expDate}
        statusStyle={statusStyle}
        showStatus={false}
        variant="minimal"
        style={{ marginBottom: 30 }}
      />

      {/* Bill To */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 5 }}>BILL TO</div>
        <div>{estimate.client_name}</div>
        {estimate.client_address && <div>{estimate.client_address}</div>}
        {estimate.client_email && <div>{estimate.client_email}</div>}
      </div>

      {/* Project */}
      {estimate.title && <div style={{ marginBottom: 20, fontWeight: 'bold' }}>{estimate.title}</div>}

      {/* Notes */}
      {estimate.notes && (
        <div style={{ marginBottom: 20, padding: '10px', background: '#f5f5f5' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 5 }}>NOTES</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
        </div>
      )}

      {/* Line items */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi}>
              {group.name && <div style={{ fontWeight: 'bold', marginTop: 10 }}>{group.name}</div>}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '5px', fontSize: 10 }}>Description</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'right', padding: '5px', fontSize: 10 }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'right', padding: '5px', fontSize: 10 }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '5px', fontSize: 10 }}>Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '5px', fontSize: 10 }}>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #ddd' }}>
                      {lineCols.description && <td style={{ padding: '5px' }}>{item.service_name}</td>}
                      {lineCols.quantity && <td style={{ textAlign: 'right', padding: '5px' }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'right', padding: '5px' }}>{item.unit || 'ea'}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '5px' }}>${(item.unit_price || 0).toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '5px', fontWeight: 'bold' }}>${(item.line_total || 0).toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <DocumentSummary
        estimate={estimate}
        documentType={documentType}
        showPrices={showPrices}
        total={total}
        subtotal={estimate.subtotal || 0}
        depositPct={depositPct}
        depositAmount={depositAmount}
        remaining={remaining}
        isEstimate={isEstimate}
        variant="minimal"
        style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #000' }}
      />

      {/* Footer */}
      <DocumentFooter
        today={today}
        companyName="FSM Pro"
        licenseNumber="#2024-FSM-01"
        variant="minimal"
        style={{ marginTop: 40, paddingTop: 10, borderTop: '1px solid #ddd' }}
      />
    </div>
  );

  const renderStandardTemplate = () => (
    <div id="estimate-document" style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, background: 'white', color: '#0f172a', minWidth: 640 }}>
      {/* HEADER */}
      <div style={{ background: '#0f172a', padding: '36px 52px 30px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px' }}>FSM Pro</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>Field Service Management</div>
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
              Portland, OR 97201<br />info@fsmpro.com<br />(503) 555-0100
            </div>
          </div>

          <DocumentHeader
            estimate={estimate}
            documentType={documentType}
            today={today}
            expDate={expDate}
            statusStyle={statusStyle}
            showStatus={true}
            variant="standard"
            style={{ textAlign: 'right', color: 'white' }}
          />
        </div>
      </div>

      {/* BILL TO + PROJECT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '28px 52px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{estimate.client_name}</div>
          {estimate.client_address && <div style={{ color: '#475569', fontSize: 13, marginBottom: 4 }}>{estimate.client_address}</div>}
          {estimate.client_email && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 3 }}>✉ {estimate.client_email}</div>}
          {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 12 }}>📞 {estimate.client_phone}</div>}
        </div>
        <div style={{ padding: '28px 52px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Project Details</div>
          {estimate.title && <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 10 }}>{estimate.title}</div>}
          {hasProjectDates_ && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
              {startDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Start</div><div style={{ color: '#334155', fontSize: 12 }}>{startDate}</div></div>}
              {endDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>End</div><div style={{ color: '#334155', fontSize: 12 }}>{endDate}</div></div>}
            </div>
          )}
          {estimate.assigned_to && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Assigned To</div>
              <div style={{ color: '#334155', fontSize: 12 }}>{estimate.assigned_to}</div>
            </div>
          )}
        </div>
      </div>

      {/* NOTES */}
      {estimate.notes && (
        <div style={{ padding: '20px 52px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* LINE ITEMS */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ padding: '28px 52px 0' }}>
          {groups.map((group, gi) => {
            const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
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
                    {lineCols.total && <span style={{ color: '#94a3b8', fontSize: 11 }}>${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
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
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.service_name || item.name}</div>
                          {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={td}>{parseFloat(item.quantity) % 1 === 0 ? parseInt(item.quantity) : (item.quantity || 0)}</td>}
                        {lineCols.unit && <td style={td}>{item.unit || 'ea'}</td>}
                        {lineCols.price && <td style={td}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                        {lineCols.total && <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>${(parseFloat(item.line_total || item.total_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                    {showGroupHeader && lineCols.total && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={Object.values(lineCols).filter(Boolean).length - 1} style={{ ...tdLeft, fontWeight: 600, color: '#334155', fontSize: 12, padding: '8px 12px', borderBottom: 'none' }}>Subtotal — {group.name}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#334155', borderBottom: 'none', padding: '8px 12px' }}>${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
      <DocumentSummary
        estimate={estimate}
        documentType={documentType}
        showPrices={showPrices}
        total={total}
        subtotal={estimate.subtotal || 0}
        depositPct={depositPct}
        depositAmount={depositAmount}
        remaining={remaining}
        isEstimate={isEstimate}
        variant="standard"
      />

      {/* TERMS */}
      {opts.showTerms && [
        { field: 'exclusions', label: 'Exclusions' },
        { field: 'payment_terms', label: 'Payment Terms' },
        { field: 'warranty_terms', label: 'Warranty' },
        { field: 'legal_terms', label: 'Terms & Conditions' },
      ].filter(s => estimate[s.field]).map(s => (
        <div key={s.field} style={{ margin: '0 52px', borderTop: '1px solid #e2e8f0', padding: '20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate[s.field]}</p>
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
        today={today}
        companyName="FSM Pro"
        licenseNumber="#2024-FSM-01"
        variant="standard"
        showDate={false}
        showCompany={true}
        showLicense={true}
      />
    </div>
  );

  const renderModernTemplate = () => {
    const accentColor = '#7c3aed';
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: '#1f2937', background: 'white', padding: '40px' }}>
        {/* Header */}
        <div style={{ marginBottom: 30, paddingBottom: 20, borderBottom: `4px solid ${accentColor}` }}>
          <DocumentHeader
            estimate={estimate}
            documentType={documentType}
            today={today}
            expDate={expDate}
            statusStyle={statusStyle}
            showStatus={false}
            variant="modern"
            style={{ color: '#111' }}
          />
        </div>

        {/* Two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginBottom: 30 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: accentColor, textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 5 }}>{estimate.client_name}</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.8 }}>
              {estimate.client_address && <div>{estimate.client_address}</div>}
              {estimate.client_email && <div>{estimate.client_email}</div>}
              {estimate.client_phone && <div>{estimate.client_phone}</div>}
            </div>
          </div>
          <div>
            {estimate.title && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: accentColor, textTransform: 'uppercase', marginBottom: 8 }}>Project</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>{estimate.title}</div>
              </div>
            )}
            {showPrices && (
              <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>Amount Due</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: accentColor }}>${total.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div style={{ background: '#f0f9ff', border: `1px solid ${accentColor}`, borderRadius: 8, padding: 15, marginBottom: 30 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
          </div>
        )}

        {/* Line items */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            {groups.map((group, gi) => (
              <div key={group.id || gi} style={{ marginBottom: 20 }}>
                {group.name && <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${accentColor}` }}>{group.name}</div>}
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
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.unit || 'ea'}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${(item.unit_price || 0).toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: accentColor }}>${(item.line_total || 0).toFixed(2)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <DocumentSummary
          estimate={estimate}
          documentType={documentType}
          showPrices={showPrices}
          total={total}
          subtotal={estimate.subtotal || 0}
          depositPct={depositPct}
          depositAmount={depositAmount}
          remaining={remaining}
          isEstimate={isEstimate}
          variant="modern"
          style={{ marginBottom: 30 }}
        />

        {/* Footer */}
        <DocumentFooter
          today={today}
          companyName="FSM Pro"
          licenseNumber=""
          variant="modern"
          showDate={true}
          showCompany={true}
          showLicense={false}
          style={{ borderTop: `2px solid ${accentColor}`, paddingTop: 20, marginTop: 20, textAlign: 'center' }}
        />
      </div>
    );
  };

  const renderExecutiveTemplate = () => (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#2d2d2d', background: 'white', padding: '50px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 30, borderBottom: '2px solid #d4a574' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 }}>FSM Pro</div>
          <div style={{ fontSize: 11, color: '#7a7a7a', letterSpacing: 2, textTransform: 'uppercase' }}>Professional Services</div>
        </div>
        <DocumentHeader
          estimate={estimate}
          documentType={documentType}
          today={null}
          expDate={null}
          statusStyle={statusStyle}
          showStatus={false}
          variant="executive"
          style={{ textAlign: 'right' }}
        />
      </div>

      {/* Client & Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#7a7a7a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Prepared For</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 }}>{estimate.client_name}</div>
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8 }}>
            {estimate.client_address && <div>{estimate.client_address}</div>}
            {estimate.client_email && <div>{estimate.client_email}</div>}
            {estimate.client_phone && <div>{estimate.client_phone}</div>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#7a7a7a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Document Details</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span>Date:</span>
            <span style={{ fontWeight: 'bold' }}>{today}</span>
          </div>
          {expDate && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span>Expiration:</span>
              <span style={{ fontWeight: 'bold' }}>{expDate}</span>
            </div>
          )}
          {showPrices && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTop: '1px solid #d4a574', fontSize: 13 }}>
              <span style={{ fontWeight: 'bold', color: '#d4a574' }}>Total Amount:</span>
              <span style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: 16 }}>${total.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      {estimate.title && (
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>{estimate.title}</div>
        </div>
      )}

      {/* Notes */}
      {estimate.notes && (
        <div style={{ marginBottom: 30, padding: '20px', background: '#faf8f3', borderLeft: '4px solid #d4a574' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#1a1a1a' }}>Summary</div>
          <div style={{ fontSize: 11, lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
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
                      {lineCols.unit && <td style={{ textAlign: 'center', padding: '10px', fontSize: 11 }}>{item.unit || 'ea'}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${(item.unit_price || 0).toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: '#d4a574' }}>${(item.line_total || 0).toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <DocumentSummary
        estimate={estimate}
        documentType={documentType}
        showPrices={showPrices}
        total={total}
        subtotal={estimate.subtotal || 0}
        depositPct={depositPct}
        depositAmount={depositAmount}
        remaining={remaining}
        isEstimate={isEstimate}
        variant="executive"
        style={{ marginBottom: 40 }}
      />

      {/* Footer */}
      <DocumentFooter
        today={today}
        companyName="FSM Pro"
        licenseNumber=""
        variant="executive"
        showDate={true}
        showCompany={false}
        showLicense={false}
        style={{ paddingTop: 20, borderTop: '2px solid #d4a574', textAlign: 'center', marginTop: 40 }}
      />
    </div>
  );

  const renderCompactTemplate = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#222', background: 'white', display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '35%', background: '#f0f0f0', padding: '30px', borderRight: '1px solid #ddd' }}>
        <DocumentHeader
          estimate={estimate}
          documentType={documentType}
          today={null}
          expDate={null}
          statusStyle={statusStyle}
          showStatus={false}
          variant="compact"
        />

        <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{estimate.client_name}</div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 15 }}>
          {estimate.client_address && <div>{estimate.client_address}</div>}
          {estimate.client_email && <div>{estimate.client_email}</div>}
        </div>

        {estimate.title && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 5 }}>Project</div>
            <div style={{ marginBottom: 15 }}>{estimate.title}</div>
          </div>
        )}

        <div style={{ background: 'white', padding: '12px', borderRadius: 4, marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>SUMMARY</div>
          <DocumentSummary
            estimate={estimate}
            documentType={documentType}
            showPrices={showPrices}
            total={total}
            subtotal={estimate.subtotal || 0}
            depositPct={depositPct}
            depositAmount={depositAmount}
            remaining={remaining}
            isEstimate={isEstimate}
            variant="compact"
            style={{}}
          />
        </div>

        {estimate.status && (
          <div style={{ marginTop: 20, padding: '8px', background: statusStyle.bg, color: statusStyle.color, borderRadius: 4, textAlign: 'center', fontSize: 10, fontWeight: 'bold' }}>
            {estimate.status.toUpperCase()}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '30px' }}>
        {estimate.notes && (
          <div style={{ marginBottom: 20, padding: '15px', background: '#f9f9f9', borderLeft: '3px solid #0066cc' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
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
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '6px', fontSize: 11 }}>{item.unit || 'ea'}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11 }}>${(item.unit_price || 0).toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11, fontWeight: 'bold' }}>${(item.line_total || 0).toFixed(2)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Terms */}
        {opts.showTerms && estimate.payment_terms && (
          <div style={{ marginTop: 20, padding: '12px', background: '#f9f9f9', fontSize: 11 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Payment Terms</div>
            <div>{estimate.payment_terms}</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProTemplate = () => (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, background: '#f8fafc', color: '#0f172a', minWidth: 640, padding: '44px' }}>
      {/* CARD HEADER */}
      <div style={{ background: '#0f172a', padding: '40px', borderRadius: 12, color: 'white', marginBottom: 32, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, background: '#1e293b', borderRadius: 14, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
                <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>FSM Pro</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Professional Services</div>
            </div>
          </div>
          <DocumentHeader
            estimate={estimate}
            documentType={documentType}
            today={today}
            expDate={null}
            statusStyle={statusStyle}
            showStatus={false}
            variant="pro"
            style={{ textAlign: 'right', color: 'white' }}
          />
        </div>
      </div>

      {/* CONTENT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: 'white', padding: '28px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 }}>{estimate.client_name}</div>
          <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.8 }}>
            {estimate.client_address && <div>{estimate.client_address}</div>}
            {estimate.client_email && <div style={{ marginTop: 4 }}>✉ {estimate.client_email}</div>}
            {estimate.client_phone && <div>📞 {estimate.client_phone}</div>}
          </div>
        </div>

        <div style={{ background: 'white', padding: '28px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Project Details</div>
          {estimate.title && <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 12 }}>{estimate.title}</div>}
          {hasProjectDates_ && (
            <div style={{ display: 'flex', gap: 16 }}>
              {startDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Start</div><div style={{ color: '#334155', fontSize: 12 }}>{startDate}</div></div>}
              {endDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>End</div><div style={{ color: '#334155', fontSize: 12 }}>{endDate}</div></div>}
            </div>
          )}
        </div>
      </div>

      {/* NOTES CARD */}
      {estimate.notes && (
        <div style={{ background: 'white', padding: '28px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* LINE ITEMS CARD */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ background: 'white', padding: '28px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {groups.map((group, gi) => (
            <div key={group.id || gi}>
              {group.name && <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #38bdf8' }}>{group.name}</div>}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {lineCols.description && <th style={{ textAlign: 'left', padding: '12px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Description</th>}
                    {lineCols.quantity && <th style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', width: 70 }}>Qty</th>}
                    {lineCols.unit && <th style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', width: 70 }}>Unit</th>}
                    {lineCols.price && <th style={{ textAlign: 'right', padding: '12px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', width: 100 }}>Price</th>}
                    {lineCols.total && <th style={{ textAlign: 'right', padding: '12px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', width: 120 }}>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {(group.items || []).map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {lineCols.description && <td style={{ padding: '14px 0' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.service_name || item.name}</div>
                        {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>}
                      </td>}
                      {lineCols.quantity && <td style={{ textAlign: 'center', padding: '14px 0', color: '#64748b', fontSize: 13 }}>{item.quantity}</td>}
                      {lineCols.unit && <td style={{ textAlign: 'center', padding: '14px 0', color: '#64748b', fontSize: 13 }}>{item.unit || 'ea'}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '14px 0', color: '#64748b', fontSize: 13 }}>${(item.unit_price || 0).toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '14px 0', color: '#0f172a', fontSize: 13, fontWeight: 700 }}>${(item.line_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* SUMMARY CARD */}
      <div style={{ background: 'white', padding: '28px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Financial Summary</div>
        <DocumentSummary
          estimate={estimate}
          documentType={documentType}
          showPrices={showPrices}
          total={total}
          subtotal={estimate.subtotal || 0}
          depositPct={depositPct}
          depositAmount={depositAmount}
          remaining={remaining}
          isEstimate={isEstimate}
          variant="pro"
          style={{}}
        />
      </div>

      {/* FOOTER */}
      <DocumentFooter
        today={today}
        companyName="FSM Pro"
        licenseNumber="#2024-FSM-01"
        variant="pro"
        showDate={true}
        showCompany={true}
        showLicense={true}
        style={{ background: 'white', padding: '20px 28px', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}
      />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER SELECTION
  // ═══════════════════════════════════════════════════════════════════════

  switch (safeTemplate) {
    case 'minimal':
      return renderMinimalTemplate();
    case 'standard':
      return renderStandardTemplate();
    case 'modern':
      return renderModernTemplate();
    case 'executive':
      return renderExecutiveTemplate();
    case 'compact':
      return renderCompactTemplate();
    case 'pro':
      return renderProTemplate();
    default:
      return renderStandardTemplate();
  }
}