import React from 'react';

/**
 * EstimateTemplateRenderer — Universal document renderer with 6 distinct templates
 * 
 * Templates:
 * 1. minimal - Clean, sparse, B&W, minimal styling
 * 2. compact - Space-efficient, dense layout, sidebar style
 * 3. professional - Corporate, clean, balanced (DEFAULT)
 * 4. modern - Contemporary, colored accents, rounded
 * 5. executive - Premium, elegant, serif fonts, gold accents
 * 6. detailed - Comprehensive, verbose, all information visible
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

export default function EstimateTemplateRenderer({ estimate, template = 'professional', options = {}, documentType = 'estimate' }) {
  if (!estimate) return null;

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    hideInternalNotes: options.hideInternalNotes !== false,
  };

  // Document type logic
  const isWorkOrder = documentType === 'workorder';
  const isInvoice = documentType === 'invoice';
  const isEstimate = documentType === 'estimate';
  const showPrices = isWorkOrder ? false : opts.showPrices;

  // Resolve groups vs flat items
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

  // Date formatting
  const fmt = (dateStr) => dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expDate = fmt(estimate.expiration_date);
  const startDate = fmt(estimate.project_start_date);
  const endDate = fmt(estimate.project_end_date);

  // Financial calculations
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

  // Column configuration for line items
  const lineCols = getLineItemColumns(documentType);
  const hasProjectDates_ = hasProjectDates(startDate, endDate);

  // Safe template selector with fallback
  const safeTemplate = ['minimal', 'compact', 'professional', 'modern', 'executive', 'detailed'].includes(template) ? template : 'professional';

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 1: MINIMAL
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'minimal') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', padding: '40px', background: 'white', lineHeight: 1.6 }}>
        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 2 }}>{docTypeLabel}</div>
          <div style={{ fontSize: 14, color: '#666' }}>#{estimate.estimate_number}</div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 5 }}>BILL TO</div>
          <div>{estimate.client_name}</div>
          {estimate.client_address && <div>{estimate.client_address}</div>}
          {estimate.client_email && <div>{estimate.client_email}</div>}
        </div>

        {/* Project details */}
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
        {showPrices && (
          <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span>Subtotal:</span>
              <span>${(estimate.subtotal || 0).toFixed(2)}</span>
            </div>
            {estimate.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span>Discount:</span>
                <span>-${(estimate.discount_amount || 0).toFixed(2)}</span>
              </div>
            )}
            {estimate.tax_rate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span>Tax:</span>
                <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13, marginTop: 10 }}>
              <span>TOTAL:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {isEstimate && depositPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10 }}>
                <span>Deposit Due:</span>
                <span>${depositAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 10, borderTop: '1px solid #ddd', fontSize: 9, color: '#666' }}>
          FSM Pro · {today}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 2: COMPACT
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'compact') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#222', background: 'white', display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '35%', background: '#f0f0f0', padding: '30px', borderRight: '1px solid #ddd' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 3 }}>{docTypeLabel}</div>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#0066cc', marginBottom: 20 }}>#{estimate.estimate_number}</div>

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

          {showPrices && (
            <div style={{ background: 'white', padding: '12px', borderRadius: 4, marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                <span>Subtotal:</span>
                <span>${(estimate.subtotal || 0).toFixed(2)}</span>
              </div>
              {estimate.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                  <span>Tax:</span>
                  <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 12, borderTop: '1px solid #ddd', paddingTop: 5, marginTop: 5 }}>
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {estimate.status && (
            <div style={{ marginTop: 20, padding: '8px', background: statusStyle.bg, color: statusStyle.color, borderRadius: 4, textAlign: 'center', fontSize: 10, fontWeight: 'bold' }}>
              {estimate.status.toUpperCase()}
            </div>
          )}
        </div>

        {/* Main content */}
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
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 3: PROFESSIONAL (DEFAULT)
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'professional') {
    return (
      <div id="estimate-document" style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, background: 'white', color: '#0f172a', minWidth: 640 }}>
        {/* CORPORATE HEADER */}
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

            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{docTypeLabel}</div>
              <div style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>#{estimate.estimate_number || '—'}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.9 }}>
                Date: {today}<br />
                {expDate && <>Expires: {expDate}<br /></>}
              </div>
              {estimate.status && (
                <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.color }}>
                  {estimate.status}
                </div>
              )}
            </div>
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

        {/* LINE ITEMS TABLE */}
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
                      {showPrices && <span style={{ color: '#94a3b8', fontSize: 11 }}>${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
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
        {showPrices && (
          <div style={{ padding: '16px 52px 32px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 310 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
                <span>Subtotal</span>
                <span>${(estimate.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {(estimate.discount_amount > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e2e8f0', color: '#dc2626', fontSize: 13 }}>
                  <span>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}</span>
                  <span>-${(estimate.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {(estimate.tax_rate > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
                  <span>Tax ({estimate.tax_rate}%)</span>
                  <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', marginTop: 6, background: '#0f172a', borderRadius: 8, color: 'white' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 19 }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {isEstimate && depositPct > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e2e8f0', color: '#0369a1', fontSize: 13, marginTop: 10 }}>
                    <span style={{ fontWeight: 600 }}>Deposit Due ({depositPct}%)</span>
                    <span style={{ fontWeight: 700 }}>${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', color: '#475569', fontSize: 13 }}>
                    <span>Remaining Balance</span>
                    <span style={{ fontWeight: 600 }}>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
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
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8pt', color: '#94a3b8' }}>
          <div>FSM Pro · License #2024-FSM-01</div>
          <div>Page · Confidential</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 4: MODERN
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'modern') {
    const accentColor = '#7c3aed';
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: '#1f2937', background: 'white', padding: '40px' }}>
        {/* Header with accent */}
        <div style={{ marginBottom: 30, paddingBottom: 20, borderBottom: `4px solid ${accentColor}` }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: accentColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{docTypeLabel}</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#111', marginBottom: 10 }}>#{estimate.estimate_number}</div>
          <div style={{ display: 'flex', gap: 30, color: '#666', fontSize: 11 }}>
            <div>Date: {today}</div>
            {expDate && <div>Expires: {expDate}</div>}
          </div>
        </div>

        {/* Two-column layout */}
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
        {showPrices && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                <span>Subtotal:</span>
                <span>${(estimate.subtotal || 0).toFixed(2)}</span>
              </div>
              {estimate.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                  <span>Tax ({estimate.tax_rate}%):</span>
                  <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, color: '#059669', borderBottom: '1px solid #e5e7eb' }}>
                  <span>Discount:</span>
                  <span>-${(estimate.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 13, fontWeight: 'bold', color: accentColor, background: '#f3f4f6', padding: '12px 8px', borderRadius: 4, marginTop: 8 }}>
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {isEstimate && depositPct > 0 && (
                <div style={{ marginTop: 10, padding: '10px', background: '#f0f9ff', borderRadius: 4, fontSize: 10 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Deposit Due ({depositPct}%)</div>
                  <div style={{ fontWeight: 'bold', color: accentColor }}>${depositAmount.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms & Footer */}
        <div style={{ borderTop: `2px solid ${accentColor}`, paddingTop: 20, marginTop: 20, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
          FSM Pro · {today}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 5: EXECUTIVE
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'executive') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#2d2d2d', background: 'white', padding: '50px' }}>
        {/* Elegant header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 30, borderBottom: '2px solid #d4a574' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 }}>FSM Pro</div>
            <div style={{ fontSize: 11, color: '#7a7a7a', letterSpacing: 2, textTransform: 'uppercase' }}>Professional Services</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#d4a574', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{docTypeLabel}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' }}>#{estimate.estimate_number}</div>
          </div>
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

        {estimate.title && (
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>{estimate.title}</div>
          </div>
        )}

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
        {showPrices && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, borderBottom: '1px solid #d4a574' }}>
                <span>Subtotal:</span>
                <span>${(estimate.subtotal || 0).toFixed(2)}</span>
              </div>
              {estimate.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, color: '#d4a574', borderBottom: '1px solid #d4a574' }}>
                  <span>Discount:</span>
                  <span>-${(estimate.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              {estimate.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 11, borderBottom: '1px solid #d4a574' }}>
                  <span>Tax:</span>
                  <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontSize: 14, fontWeight: 'bold', color: '#d4a574' }}>
                <span>TOTAL AMOUNT:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {isEstimate && depositPct > 0 && (
                <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #d4a574', fontSize: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span>Deposit ({depositPct}%):</span>
                    <span style={{ fontWeight: 'bold' }}>${depositAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 20, borderTop: '2px solid #d4a574', textAlign: 'center', fontSize: 10, color: '#7a7a7a', marginTop: 40 }}>
          <div>Portland, OR · info@fsmpro.com · (503) 555-0100</div>
          <div style={{ marginTop: 8 }}>{today}</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE 6: DETAILED
  // ═══════════════════════════════════════════════════════════════════════
  if (safeTemplate === 'detailed') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#222', background: 'white', padding: '30px' }}>
        {/* Full header */}
        <div style={{ marginBottom: 30, paddingBottom: 15, borderBottom: '3px solid #003d99' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#003d99' }}>FSM Pro</div>
              <div style={{ fontSize: 10, color: '#666' }}>Portland, OR 97201</div>
              <div style={{ fontSize: 10, color: '#666' }}>info@fsmpro.com | (503) 555-0100</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#003d99', textTransform: 'uppercase', letterSpacing: 1 }}>{docTypeLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>#{estimate.estimate_number}</div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 25, fontSize: 10 }}>
          <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 3 }}>DATE</div>
            <div>{today}</div>
          </div>
          {expDate && (
            <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 3 }}>EXPIRES</div>
              <div>{expDate}</div>
            </div>
          )}
          {estimate.status && (
            <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 3 }}>STATUS</div>
              <div style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{estimate.status}</div>
            </div>
          )}
        </div>

        {/* Bill To & Project */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
          <div style={{ background: '#f9f9f9', padding: 15, borderLeft: '4px solid #003d99' }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 8, fontSize: 10, textTransform: 'uppercase' }}>Bill To</div>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 5 }}>{estimate.client_name}</div>
            <div style={{ fontSize: 10, color: '#666', lineHeight: 1.8 }}>
              {estimate.client_address && <div>{estimate.client_address}</div>}
              {estimate.client_email && <div>Email: {estimate.client_email}</div>}
              {estimate.client_phone && <div>Phone: {estimate.client_phone}</div>}
            </div>
          </div>
          <div style={{ background: '#f9f9f9', padding: 15, borderLeft: '4px solid #003d99' }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 8, fontSize: 10, textTransform: 'uppercase' }}>Project Details</div>
            {estimate.title && <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>{estimate.title}</div>}
            {hasProjectDates_ && (
             <>
               {startDate && <div style={{ fontSize: 10, marginBottom: 3 }}><strong>Start:</strong> {startDate}</div>}
               {endDate && <div style={{ fontSize: 10, marginBottom: 3 }}><strong>End:</strong> {endDate}</div>}
             </>
            )}
            {estimate.assigned_to && <div style={{ fontSize: 10 }}><strong>Assigned to:</strong> {estimate.assigned_to}</div>}
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div style={{ background: '#f9f9f9', padding: 15, marginBottom: 25, borderLeft: '4px solid #003d99' }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 8, fontSize: 10, textTransform: 'uppercase' }}>Notes</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{estimate.notes}</div>
          </div>
        )}

        {/* Line items - comprehensive */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ marginBottom: 25 }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 12, fontSize: 12, textTransform: 'uppercase' }}>Itemized Services & Materials</div>
            {groups.map((group, gi) => (
              <div key={group.id || gi} style={{ marginBottom: 20 }}>
                {group.name && <div style={{ background: '#003d99', color: 'white', padding: '8px 10px', fontWeight: 'bold', marginBottom: 0, marginTop: gi > 0 ? 15 : 0 }}>{group.name}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e6e6e6' }}>
                      {lineCols.description && <th style={{ textAlign: 'left', padding: '8px', fontSize: 10, fontWeight: 'bold' }}>Description</th>}
                      {lineCols.quantity && <th style={{ textAlign: 'center', padding: '8px', fontSize: 10, fontWeight: 'bold', width: 50 }}>Qty</th>}
                      {lineCols.unit && <th style={{ textAlign: 'center', padding: '8px', fontSize: 10, fontWeight: 'bold', width: 40 }}>Unit</th>}
                      {lineCols.price && <th style={{ textAlign: 'right', padding: '8px', fontSize: 10, fontWeight: 'bold', width: 80 }}>Unit Price</th>}
                      {lineCols.total && <th style={{ textAlign: 'right', padding: '8px', fontSize: 10, fontWeight: 'bold', width: 100 }}>Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #ddd' }}>
                        {lineCols.description && <td style={{ padding: '8px', fontSize: 11 }}>
                          <div style={{ fontWeight: 'bold' }}>{item.service_name}</div>
                          {item.description && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{item.description}</div>}
                        </td>}
                        {lineCols.quantity && <td style={{ textAlign: 'center', padding: '8px', fontSize: 11 }}>{item.quantity}</td>}
                        {lineCols.unit && <td style={{ textAlign: 'center', padding: '8px', fontSize: 11 }}>{item.unit || 'ea'}</td>}
                        {lineCols.price && <td style={{ textAlign: 'right', padding: '8px', fontSize: 11 }}>${(item.unit_price || 0).toFixed(2)}</td>}
                        {lineCols.total && <td style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 'bold' }}>${(item.line_total || 0).toFixed(2)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Comprehensive totals */}
        {showPrices && (
          <div style={{ marginBottom: 25, background: '#f9f9f9', padding: 15 }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 10, fontSize: 11, textTransform: 'uppercase' }}>Financial Summary</div>
            <table style={{ width: '100%', fontSize: 11 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '5px 0', textAlign: 'left' }}>Subtotal:</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 'bold' }}>${(estimate.subtotal || 0).toFixed(2)}</td>
                </tr>
                {estimate.discount_amount > 0 && (
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '5px 0', textAlign: 'left' }}>Discount{estimate.discount_type === 'percent' ? ` (${estimate.discount_value}%)` : ''}:</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 'bold', color: '#c41e3a' }}>-${(estimate.discount_amount || 0).toFixed(2)}</td>
                  </tr>
                )}
                {estimate.tax_rate > 0 && (
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '5px 0', textAlign: 'left' }}>Tax ({estimate.tax_rate}%):</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 'bold' }}>${(estimate.tax_amount || 0).toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ background: '#003d99', color: 'white' }}>
                  <td style={{ padding: '8px 0', textAlign: 'left', fontWeight: 'bold' }}>TOTAL:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', fontSize: 13 }}>${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {isEstimate && depositPct > 0 && (
              <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #ddd', fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span><strong>Deposit Due ({depositPct}%):</strong></span>
                  <span>${depositAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Remaining Balance:</strong></span>
                  <span>${remaining.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terms */}
        {opts.showTerms && [
          { field: 'payment_terms', label: 'Payment Terms' },
          { field: 'exclusions', label: 'Exclusions' },
          { field: 'warranty_terms', label: 'Warranty' },
        ].filter(s => estimate[s.field]).map(s => (
          <div key={s.field} style={{ marginBottom: 15, padding: 12, background: '#f9f9f9', borderLeft: '4px solid #003d99' }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 5, fontSize: 10, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{estimate[s.field]}</div>
          </div>
        ))}

        {/* Signature block */}
        {opts.showSignatures && !isWorkOrder && (
          <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', color: '#003d99', marginBottom: 15, fontSize: 10, textTransform: 'uppercase' }}>Signatures</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
              <div>
                <div style={{ borderBottom: '1px solid #000', height: 40, marginBottom: 5 }} />
                <div style={{ fontSize: 9, fontWeight: 'bold' }}>Authorized Signature</div>
                <div style={{ fontSize: 9, color: '#666' }}>Name & Date</div>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #000', height: 40, marginBottom: 5 }} />
                <div style={{ fontSize: 9, fontWeight: 'bold' }}>Client Signature</div>
                <div style={{ fontSize: 9, color: '#666' }}>Name & Date</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 30, paddingTop: 15, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 9, color: '#666' }}>
          <div>FSM Pro · Portland, OR · License #2024-FSM-01</div>
          <div style={{ marginTop: 5 }}>This document is confidential and intended for the recipient only.</div>
        </div>
      </div>
    );
  }

  // Fallback — unknown template, use professional
  return <EstimateTemplateRenderer {...{ estimate, template: 'professional', options, documentType }} />;
}