import React from 'react';
import DocumentHeader from '../documents/DocumentHeader';
import DocumentFooter from '../documents/DocumentFooter';
import DocumentSummary from '../documents/DocumentSummary';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import CompanyLogoBlock from '../documents/CompanyLogoBlock';
import useCompanyConfig from '@/hooks/useCompanyConfig';

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
  const cc = useCompanyConfig();
  if (!estimate) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // COMMON SETUP (shared by all templates)
  // ═══════════════════════════════════════════════════════════════════════

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    showProjectDates: options.showProjectDates !== false,
    showDeposit: options.showDeposit !== false,
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

  // Normalize template aliases (professional → pro, detailed → pro, standard → standard)
  const templateMap = { professional: 'pro', detailed: 'pro', standard: 'standard' };
  const normalizedTemplate = templateMap[template] || template;
  const safeTemplate = ['minimal', 'standard', 'modern', 'executive', 'compact', 'pro'].includes(normalizedTemplate) ? normalizedTemplate : 'standard';

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER HELPERS (reusable sections)
  // ═══════════════════════════════════════════════════════════════════════

  const renderMinimalTemplate = () => (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#222', padding: '40px', background: 'white', lineHeight: 1.6, maxWidth: 760 }}>

      {/* ── HEADER: Logo + Company + Document info ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #222' }}>
        {/* Company / Logo left */}
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           {cc.logo_url && <CompanyLogoBlock logoUrl={cc.logo_url} size={40} borderColor="#222" bgColor="#f5f5f5" />}
           <div>
             <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 4 }}>{cc.name || appConfig.company.name}</div>
             <div style={{ fontSize: 10, color: '#555', lineHeight: 1.7 }}>
               {cc.address || appConfig.company.address}<br />
               {cc.email || appConfig.company.email} &nbsp;·&nbsp; {cc.phone || appConfig.company.phone}
             </div>
           </div>
         </div>
        {/* Document number + date right */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{docTypeLabel}</div>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>#{estimate.estimate_number || estimate.invoice_number || '—'}</div>
          <div style={{ fontSize: 10, color: '#555' }}>{today}</div>
          {expDate && <div style={{ fontSize: 10, color: '#555' }}>Expires: {expDate}</div>}
        </div>
      </div>

      {/* ── BILL TO + PROJECT DATES ── */}
      <div style={{ display: 'flex', gap: 40, marginBottom: 24 }}>
        {/* Bill To */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Bill To</div>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 3 }}>{estimate.client_name}</div>
          {estimate.client_address && <div style={{ color: '#444', fontSize: 11 }}>{estimate.client_address}</div>}
          {estimate.client_email && <div style={{ color: '#555', fontSize: 10 }}>{estimate.client_email}</div>}
          {estimate.client_phone && <div style={{ color: '#555', fontSize: 10 }}>{estimate.client_phone}</div>}
        </div>
        {/* Project dates — optional */}
        {opts.showProjectDates && (startDate || endDate) && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Project Schedule</div>
            {startDate && <div style={{ fontSize: 11, marginBottom: 3 }}><span style={{ color: '#888' }}>Start: </span>{startDate}</div>}
            {endDate && <div style={{ fontSize: 11 }}><span style={{ color: '#888' }}>End: </span>{endDate}</div>}
          </div>
        )}
      </div>

      {/* ── Project title ── */}
      {estimate.title && (
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 16 }}>{estimate.title}</div>
      )}

      {/* ── LINE ITEMS ── */}
      {opts.showBreakdown && groups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
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
                      {lineCols.unit && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11 }}>{item.unit || 'ea'}</td>}
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11 }}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '7px 8px', fontSize: 11, fontWeight: 'bold' }}>${(parseFloat(item.line_total) || 0).toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── TOTALS ── */}
      <DocumentSummary
        estimate={estimate}
        documentType={documentType}
        showPrices={showPrices}
        showDeposit={opts.showDeposit}
        total={total}
        subtotal={estimate.subtotal || 0}
        depositPct={depositPct}
        depositAmount={depositAmount}
        remaining={remaining}
        isEstimate={isEstimate}
        variant="minimal"
        style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #bbb' }}
      />

      {/* ── DEPOSIT CALLOUT (si aplica) ── */}
      {isEstimate && depositPct > 0 && opts.showDeposit && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 3 }}>DEPOSIT REQUIRED TO START</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1e40af' }}>
            ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({depositPct}%)
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>
            Remaining balance of ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} due upon completion.
          </div>
        </div>
      )}

      {/* ── PROJECT NOTES (al final, para el cliente) ── */}
      {estimate.notes && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
          <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>Notes for Client</div>
          <div style={{ fontSize: 11, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
        </div>
      )}

      {/* ── TERMS (si aplica) ── */}
      {opts.showTerms && [
        { field: 'exclusions', label: 'Exclusions' },
        { field: 'payment_terms', label: 'Payment Terms' },
        { field: 'warranty_terms', label: 'Warranty' },
        { field: 'legal_terms', label: 'Terms & Conditions' },
      ].filter(s => estimate[s.field]).map(s => (
        <div key={s.field} style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 10, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{estimate[s.field]}</div>
        </div>
      ))}

      {/* ── SIGNATURES ── */}
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

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 32, paddingTop: 10, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa' }}>
        <span>{appConfig.company.name} · {appConfig.company.city}</span>
        <span>{today}</span>
      </div>
    </div>
  );

  const renderStandardTemplate = () => (
    <div id="estimate-document" style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, background: 'white', color: '#0f172a', minWidth: 640 }}>
      {/* HEADER */}
      <div style={{ background: '#0f172a', padding: '36px 52px 30px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <CompanyLogoBlock logoUrl={cc.logo_url} size={48} />
              <div>
                 <div style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px' }}>{cc.name || appConfig.company.name}</div>
                 <div style={{ color: '#64748b', fontSize: 11 }}>{appConfig.company.tagline}</div>
               </div>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
               {cc.address || appConfig.company.address}<br />{cc.email || appConfig.company.email}<br />{cc.phone || appConfig.company.phone}
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
          {opts.showProjectDates && hasProjectDates_ && (
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
        showDeposit={opts.showDeposit}
        total={total}
        subtotal={estimate.subtotal || 0}
        depositPct={depositPct}
        depositAmount={depositAmount}
        remaining={remaining}
        isEstimate={isEstimate}
        variant="standard"
      />

      {/* DEPOSIT CALLOUT */}
      {isEstimate && depositPct > 0 && opts.showDeposit && (
        <div style={{ margin: '0 52px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Deposit Required to Start Work</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: 12, fontWeight: 'normal', color: '#3b82f6' }}>({depositPct}%)</span></div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Remaining balance: ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} — due upon project completion.</div>
        </div>
      )}

      {/* NOTES — moved to end, for client */}
      {estimate.notes && (
        <div style={{ padding: '20px 52px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Notes for Client</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

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
        companyName={appConfig.company.name}
        licenseNumber={appConfig.company.license}
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
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
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
          companyName={appConfig.company.name}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {cc.logo_url && <CompanyLogoBlock logoUrl={cc.logo_url} size={44} borderColor="#d4a574" bgColor="#faf8f3" />}
        <div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 }}>{cc.name || appConfig.company.name}</div>
          <div style={{ fontSize: 11, color: '#7a7a7a', letterSpacing: 2, textTransform: 'uppercase' }}>{appConfig.company.tagline}</div>
        </div>
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
                      {lineCols.price && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11 }}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                      {lineCols.total && <td style={{ textAlign: 'right', padding: '10px', fontSize: 11, fontWeight: 'bold', color: '#d4a574' }}>${(parseFloat(item.line_total) || 0).toFixed(2)}</td>}
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
        companyName={appConfig.company.name}
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
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11 }}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '6px', fontSize: 11, fontWeight: 'bold' }}>${(parseFloat(item.line_total) || 0).toFixed(2)}</td>}
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

  const renderProTemplate = () => {
    const PRO_ACCENT = '#1e40af';
    const PRO_ACCENT_LIGHT = '#dbeafe';
    const PRO_DARK = '#0f172a';

    const card = (extra = {}) => ({
      background: 'white',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
      overflow: 'hidden',
      ...extra,
    });

    const label = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 };

    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.55, background: '#f1f5f9', color: PRO_DARK, minWidth: 680, padding: '40px' }}>

        {/* ══ HEADER CARD ══ */}
        <div style={{ ...card(), background: PRO_DARK, color: 'white', padding: '32px 36px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* LEFT — Logo + Company */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <CompanyLogoBlock logoUrl={cc.logo_url} size={52} />
              <div>
                 <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.1 }}>{cc.name || appConfig.company.name}</div>
                 <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{appConfig.company.tagline} · {cc.address || appConfig.company.city}</div>
                 <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{cc.email || appConfig.company.email} · {cc.phone || appConfig.company.phone}</div>
               </div>
            </div>

            {/* RIGHT — Document title + number + date */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: 'white', lineHeight: 1 }}>{docTypeLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8', marginTop: 6 }}>#{estimate.estimate_number || estimate.invoice_number || '—'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{today}</div>
              {expDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Expires: {expDate}</div>}
              {estimate.status && (
                <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
                  {estimate.status.replace('_', ' ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ CLIENT + PROJECT DETAILS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Prepared For */}
          <div style={{ ...card(), padding: '22px 24px' }}>
            <div style={label}>Prepared For</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: PRO_DARK, marginBottom: 6 }}>{estimate.client_name}</div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
              {estimate.client_address && <div>{estimate.client_address}</div>}
              {estimate.client_email && <div>✉ {estimate.client_email}</div>}
              {estimate.client_phone && <div>📞 {estimate.client_phone}</div>}
            </div>
          </div>

          {/* Project info + optional dates */}
          <div style={{ ...card(), padding: '22px 24px' }}>
            <div style={label}>Project Details</div>
            {estimate.title && <div style={{ fontWeight: 700, fontSize: 14, color: PRO_DARK, marginBottom: 10 }}>{estimate.title}</div>}
            {opts.showProjectDates && (startDate || endDate) && (
              <div style={{ display: 'flex', gap: 20, marginTop: estimate.title ? 4 : 0 }}>
                {startDate && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 3 }}>Start Date</div>
                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{startDate}</div>
                  </div>
                )}
                {endDate && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 3 }}>Completion</div>
                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{endDate}</div>
                  </div>
                )}
              </div>
            )}
            {!estimate.title && !opts.showProjectDates && (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No project details specified</div>
            )}
          </div>
        </div>

        {/* ══ SERVICES TABLE CARD ══ */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ ...card(), marginBottom: 24 }}>
            {groups.map((group, gi) => {
              const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
              return (
                <div key={group.id || gi}>
                  {/* Group header bar */}
                  {group.name && (
                    <div style={{ background: PRO_DARK, color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{group.name}</span>
                      {lineCols.total && <span style={{ fontSize: 12, color: '#94a3b8' }}>${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
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
                              <div style={{ fontWeight: 600, color: PRO_DARK, fontSize: 13 }}>{item.service_name || item.name}</div>
                              {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>}
                            </td>
                          )}
                          {lineCols.quantity && <td style={{ textAlign: 'center', padding: '13px 12px', color: '#475569', fontSize: 13 }}>{item.quantity}</td>}
                          {lineCols.unit && <td style={{ textAlign: 'center', padding: '13px 12px', color: '#475569', fontSize: 12 }}>{item.unit || 'ea'}</td>}
                          {lineCols.price && <td style={{ textAlign: 'right', padding: '13px 20px', color: '#475569', fontSize: 13 }}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                          {lineCols.total && <td style={{ textAlign: 'right', padding: '13px 24px', color: PRO_DARK, fontSize: 13, fontWeight: 700 }}>${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TOTALS + DEPOSIT ══ */}
        {showPrices && (
          <div style={{ display: 'grid', gridTemplateColumns: isEstimate && depositPct > 0 && opts.showDeposit ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>

            {/* Resumen financiero */}
            <div style={{ ...card(), padding: '22px 24px' }}>
              <div style={label}>Financial Summary</div>
              {[
                { show: true, l: 'Subtotal', v: estimate.subtotal || 0 },
                { show: (estimate.discount_amount || 0) > 0, l: 'Discount', v: -(estimate.discount_amount || 0), color: '#dc2626' },
                { show: (estimate.tax_rate || 0) > 0, l: `Tax (${estimate.tax_rate}%)`, v: estimate.tax_amount || 0 },
                { show: true, l: 'TOTAL', v: total, bold: true, big: true },
              ].filter(r => r.show).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: row.bold ? `2px solid ${PRO_ACCENT_LIGHT}` : '1px solid #f1f5f9', fontSize: row.big ? 16 : 13, fontWeight: row.bold ? 800 : 400, color: row.color || (row.bold ? PRO_DARK : '#475569') }}>
                  <span>{row.l}</span>
                  <span>${Math.abs(row.v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            {/* Depósito (solo si aplica y está habilitado) */}
            {isEstimate && depositPct > 0 && opts.showDeposit && (
              <div style={{ ...card(), padding: '22px 24px', background: PRO_ACCENT_LIGHT, border: `1.5px solid ${PRO_ACCENT}` }}>
                <div style={{ ...label, color: PRO_ACCENT }}>Payment Schedule</div>
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${PRO_ACCENT}30` }}>
                  <div style={{ fontSize: 11, color: PRO_ACCENT, marginBottom: 4, fontWeight: 600 }}>Deposit to Start Work</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: PRO_ACCENT, lineHeight: 1 }}>${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3 }}>{depositPct}% of total</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#334155', marginBottom: 3, fontWeight: 600 }}>Remaining Upon Completion</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: PRO_DARK }}>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TERMS ══ */}
        {opts.showTerms && [
          { field: 'exclusions', label: 'Exclusions' },
          { field: 'payment_terms', label: 'Payment Terms' },
          { field: 'warranty_terms', label: 'Warranty' },
          { field: 'legal_terms', label: 'Terms & Conditions' },
        ].filter(s => estimate[s.field]).length > 0 && (
          <div style={{ ...card(), padding: '22px 24px', marginBottom: 24 }}>
            {[
              { field: 'exclusions', label: 'Exclusions' },
              { field: 'payment_terms', label: 'Payment Terms' },
              { field: 'warranty_terms', label: 'Warranty' },
              { field: 'legal_terms', label: 'Terms & Conditions' },
            ].filter(s => estimate[s.field]).map((s, i, arr) => (
              <div key={s.field} style={{ paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={label}>{s.label}</div>
                <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate[s.field]}</p>
              </div>
            ))}
          </div>
        )}

        {/* ══ NOTES FOR CLIENT — al final ══ */}
        {estimate.notes && (
          <div style={{ ...card(), padding: '22px 24px', marginBottom: 24, borderLeft: `4px solid ${PRO_ACCENT}` }}>
            <div style={label}>Notes for Client</div>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
          </div>
        )}

        {/* ══ SIGNATURES ══ */}
        {opts.showSignatures && !isWorkOrder && (
          <div style={{ ...card(), padding: '28px 36px', marginBottom: 24 }}>
            <div style={label}>Authorization & Signatures</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 8 }}>
              {[{ title: 'Contractor Signature', sub: `${appConfig.company.name} · Authorized Representative` }, { title: 'Client Signature & Date', sub: estimate.client_name || 'Client' }].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 52, borderBottom: `2px solid ${PRO_DARK}`, marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: PRO_DARK }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ FOOTER — en cada "página" (sutil, 8pt) ══ */}
        <div style={{ textAlign: 'center', padding: '14px 0 0', borderTop: '1px solid #e2e8f0', opacity: 0.35 }}>
          <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>
            {appConfig.company.name} &nbsp;·&nbsp; {appConfig.company.address} &nbsp;·&nbsp; License {appConfig.company.license} &nbsp;·&nbsp; {today}
          </div>
        </div>

      </div>
    );
  };

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