import React from 'react';

/**
 * EstimateTemplateRenderer — Universal document renderer
 * Used by: Preview, Review & Send, Print/PDF, Client view
 * 
 * Props:
 * - estimate: estimate data
 * - template: 'minimal' | 'compact' | 'professional' | 'modern' | 'executive' | 'detailed'
 * - options: { showPrices, showBreakdown, showTerms, showSignatures, hideInternalNotes }
 * 
 * CRITICAL: Never renders internal_notes regardless of options
 */
export default function EstimateTemplateRenderer({ estimate, template = 'professional', options = {} }) {
  if (!estimate) return null;

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    hideInternalNotes: options.hideInternalNotes !== false, // Always true for client view
  };

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

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fmt = (dateStr) => dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const expDate = fmt(estimate.expiration_date);
  const startDate = fmt(estimate.project_start_date);
  const endDate = fmt(estimate.project_end_date);

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

  // Template-specific styles
  const getHeaderStyle = () => {
    switch (template) {
      case 'minimal':
        return { background: '#ffffff', borderBottom: '3px solid #0f172a', padding: '24px 40px' };
      case 'compact':
        return { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' };
      case 'modern':
        return { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '32px 40px' };
      case 'executive':
        return { background: '#0f172a', borderBottom: '4px solid #38bdf8', padding: '40px 50px' };
      case 'detailed':
        return { background: '#0f172a', padding: '36px 52px 30px' };
      case 'professional':
      default:
        return { background: '#0f172a', padding: '36px 52px 30px' };
    }
  };

  const bodyStyle = {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
    background: 'white',
    color: '#0f172a',
    minWidth: 640,
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER BY TEMPLATE
  // ────────────────────────────────────────────────────────────────────────

  if (template === 'minimal') {
    return (
      <div id="estimate-document" style={bodyStyle}>
        {/* Header */}
        <div style={getHeaderStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {estimate.client_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Estimate #{estimate.estimate_number}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1' }}>
                ${opts.showPrices ? (total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{today}</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '24px 40px', borderBottom: '1px solid #e2e8f0' }}>
          {estimate.client_address && <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>{estimate.client_address}</div>}
          {estimate.client_email && <div style={{ fontSize: 12, color: '#64748b' }}>✉ {estimate.client_email}</div>}
          {estimate.client_phone && <div style={{ fontSize: 12, color: '#64748b' }}>📞 {estimate.client_phone}</div>}
        </div>

        {/* Items */}
        {opts.showBreakdown && groups.length > 0 && (
          <div style={{ padding: '24px 40px' }}>
            {groups.map((group, gi) => {
              const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
              return (
                <div key={group.id || gi} style={{ marginBottom: gi < groups.length - 1 ? 24 : 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {(group.items || []).map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 0', fontWeight: 600, color: '#0f172a' }}>{item.service_name}</td>
                          <td style={{ padding: '10px 0', textAlign: 'right', color: '#64748b' }}>
                            {item.quantity} {item.unit}
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {opts.showPrices ? `$${(parseFloat(item.line_total) || 0).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* Signature */}
        {opts.showSignatures && (
          <div style={{ padding: '24px 40px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              <div>
                <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 24, marginBottom: 8 }} />
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Authorized Signature</div>
              </div>
              <div>
                <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 24, marginBottom: 8 }} />
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Customer Signature</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: Professional template (same as EstimateDocumentConfigured)
  return (
    <div id="estimate-document" style={bodyStyle}>
      {/* ── HEADER ── */}
      <div style={{ background: '#0f172a', padding: '36px 52px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Estimate</div>
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

      {/* ── BILL TO + PROJECT ── */}
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
          {estimate.title && (
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 10 }}>{estimate.title}</div>
          )}
          {(startDate || endDate) && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
              {startDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Start</div><div style={{ color: '#334155', fontSize: 12 }}>{startDate}</div></div>}
              {endDate && <div><div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>End</div><div style={{ color: '#334155', fontSize: 12 }}>{endDate}</div></div>}
            </div>
          )}
          {estimate.assigned_to && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Prepared By</div>
              <div style={{ color: '#334155', fontSize: 12 }}>{estimate.assigned_to}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── CUSTOMER NOTES (top) ── */}
      {estimate.notes && (
        <div style={{ padding: '20px 52px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* ── GROUPS + LINE ITEMS ── */}
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
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>
                      {opts.showPrices ? `$${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thLeft}>Description</th>
                      <th style={{ ...th, width: 60 }}>Qty</th>
                      <th style={{ ...th, width: 60 }}>Unit</th>
                      <th style={{ ...th, width: 110 }}>Unit Price</th>
                      <th style={{ ...th, width: 120 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.items || []).length === 0 && (
                      <tr><td colSpan={5} style={{ ...tdLeft, color: '#94a3b8', fontStyle: 'italic', padding: '20px 12px' }}>No items</td></tr>
                    )}
                    {(group.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={tdLeft}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.service_name || item.name}</div>
                          {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>}
                        </td>
                        <td style={td}>{parseFloat(item.quantity) % 1 === 0 ? parseInt(item.quantity) : (item.quantity || 0)}</td>
                        <td style={td}>{item.unit || 'ea'}</td>
                        <td style={td}>{opts.showPrices ? `$${(parseFloat(item.unit_price) || 0).toFixed(2)}` : '—'}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>
                          {opts.showPrices ? `$${(parseFloat(item.line_total || item.total_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                    {showGroupHeader && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={4} style={{ ...tdLeft, fontWeight: 600, color: '#334155', fontSize: 12, padding: '8px 12px', borderBottom: 'none' }}>Subtotal — {group.name}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#334155', borderBottom: 'none', padding: '8px 12px' }}>
                          {opts.showPrices ? `$${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TOTALS ── */}
      {opts.showPrices && (
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
            {depositPct > 0 && (
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

      {/* ── TERMS & ADDITIONAL SECTIONS ── */}
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

      {/* ── SIGNATURE ── */}
      {opts.showSignatures && (
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

      {/* ── FOOTER ── */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>FSM Pro · Portland, OR · info@fsmpro.com · (503) 555-0100</div>
        <div style={{ fontSize: 11, color: '#cbd5e1' }}>Estimate #{estimate.estimate_number} · Valid 30 days from date issued</div>
      </div>
    </div>
  );
}