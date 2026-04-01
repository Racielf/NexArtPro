import React from 'react';

/**
 * EstimateDocumentConfigured — renders the estimate document respecting visibility toggles.
 * Used by EstimateSendReview for live preview + print/download/send.
 */
export default function EstimateDocumentConfigured({ estimate, visibility = {} }) {
  if (!estimate) return null;

  const v = visibility;
  const items = estimate.line_items || [];
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const expDate = v.expirationDate !== false ? fmt(estimate.expiration_date) : null;
  const startDate = v.serviceDate !== false ? fmt(estimate.project_start_date) : null;
  const endDate = v.serviceDate !== false ? fmt(estimate.project_end_date) : null;

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = depositPct > 0 ? (total * depositPct) / 100 : 0;
  const remaining = total - depositAmount;

  const statusColors = {
    approved: { bg: '#166534', color: '#bbf7d0' },
    declined: { bg: '#7f1d1d', color: '#fecaca' },
    sent: { bg: '#1e3a5f', color: '#93c5fd' },
    draft: { bg: '#1e293b', color: '#94a3b8' },
  };
  const statusStyle = statusColors[estimate.status] || statusColors.draft;

  // Decide whether to show services vs materials columns
  const showServices = v.services !== false;
  const showMaterials = v.materials !== false;
  const visibleItems = items.filter(item => {
    // simple heuristic: if item has unit_cost it's material, else service
    const isMaterial = item.unit_cost > 0;
    if (isMaterial) return showMaterials;
    return showServices;
  });

  return (
    <div
      id="estimate-document"
      style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, background: 'white', color: '#0f172a', minWidth: 640 }}
    >

      {/* ── HEADER ── */}
      <div style={{ background: '#0f172a', padding: '36px 52px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

          {/* Left: logo + company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              {v.businessLogo !== false && (
                <div style={{ width: 48, height: 48, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
                    <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <div>
                {v.businessName !== false && (
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px' }}>FSM Pro</div>
                )}
                <div style={{ color: '#64748b', fontSize: 11 }}>Field Service Management</div>
              </div>
            </div>
            {v.businessAddress !== false && (
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
                Portland, OR 97201<br />
                info@fsmpro.com<br />
                (503) 555-0100
              </div>
            )}
          </div>

          {/* Right: estimate badge */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Estimate</div>
            {v.estimateNumber !== false && (
              <div style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>#{estimate.estimate_number || '—'}</div>
            )}
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.9 }}>
              {v.estimateDate !== false && <>Date: {today}<br /></>}
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
          {v.customerName !== false && (
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{estimate.client_name}</div>
          )}
          {estimate.client_address && <div style={{ color: '#475569', fontSize: 13, marginBottom: 4 }}>{estimate.client_address}</div>}
          {estimate.client_email && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 3 }}>✉  {estimate.client_email}</div>}
          {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 12 }}>📞  {estimate.client_phone}</div>}
        </div>
        <div style={{ padding: '28px 52px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Project Details</div>
          {v.estimateName !== false && estimate.title && (
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 10 }}>{estimate.title}</div>
          )}
          {(startDate || endDate) && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
              {startDate && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Start Date</div>
                  <div style={{ color: '#334155', fontSize: 12 }}>{startDate}</div>
                </div>
              )}
              {endDate && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>End Date</div>
                  <div style={{ color: '#334155', fontSize: 12 }}>{endDate}</div>
                </div>
              )}
            </div>
          )}
          {v.technicianName !== false && estimate.assigned_to && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Prepared By</div>
              <div style={{ color: '#334155', fontSize: 12 }}>{estimate.assigned_to}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ESTIMATE MESSAGE ── */}
      {v.estimateMessage !== false && estimate.notes && (
        <div style={{ padding: '20px 52px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* ── LINE ITEMS ── */}
      {(showServices || showMaterials) && (
        <div style={{ padding: '32px 52px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
            {showServices && showMaterials ? 'Services & Materials' : showServices ? 'Services' : 'Materials'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0', width: 70 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0', width: 110 }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0', width: 120 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.name}</div>
                    {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: '#64748b' }}>{item.quantity?.toFixed(0) ?? '—'}</td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: '#64748b' }}>${(item.unit_price || 0).toFixed(2)}</td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No line items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TOTALS ── */}
      <div style={{ padding: '12px 52px 32px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
            <span>Subtotal</span>
            <span>${(estimate.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
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
                <span style={{ fontWeight: 600 }}>Deposit Required ({depositPct}%)</span>
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

      {/* ── NOTES (if not shown as message above) ── */}
      {v.estimateMessage === false && estimate.notes && (
        <div style={{ margin: '0 52px', borderTop: '1px solid #e2e8f0', padding: '24px 0 28px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Notes &amp; Terms</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* ── SIGNATURE ── */}
      <div style={{ margin: '0 52px', borderTop: '1px solid #e2e8f0', padding: '32px 0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <div>
          <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 36, marginBottom: 10 }}></div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Authorized Signature</div>
        </div>
        <div>
          <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 36, marginBottom: 10 }}></div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Customer Signature &amp; Date</div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>FSM Pro · Portland, OR · info@fsmpro.com</div>
        <div style={{ fontSize: 11, color: '#cbd5e1' }}>Estimate #{estimate.estimate_number} · Valid 30 days from date issued</div>
      </div>

    </div>
  );
}