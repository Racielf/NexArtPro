import React from 'react';

/**
 * EstimateDocument — final print-ready / preview document.
 * No inputs, no editor UI, no sidebar. Pure output.
 */
export default function EstimateDocument({ estimate }) {
  if (!estimate) return null;

  const items = estimate.line_items || [];
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expDate = estimate.expiration_date
    ? new Date(estimate.expiration_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      id="estimate-document"
      className="bg-white text-slate-900"
      style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 13, lineHeight: 1.5, minWidth: 680 }}
    >

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: '#0f172a', padding: '32px 48px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

          {/* Logo + company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>FSM Pro</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>Field Service Management</div>
              </div>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7 }}>
              Portland, OR 97201<br />
              info@fsmpro.com · (503) 555-0100
            </div>
          </div>

          {/* Estimate badge */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Estimate</div>
            <div style={{ color: 'white', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>#{estimate.estimate_number || '—'}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>Date: {today}</div>
            {expDate && <div style={{ color: '#94a3b8', fontSize: 12 }}>Expires: {expDate}</div>}
            {estimate.status && (
              <div style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: estimate.status === 'approved' ? '#166534' : estimate.status === 'declined' ? '#7f1d1d' : '#1e3a5f',
                color: estimate.status === 'approved' ? '#bbf7d0' : estimate.status === 'declined' ? '#fecaca' : '#93c5fd',
              }}>
                {estimate.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BILL TO + PROJECT ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '24px 48px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{estimate.client_name}</div>
          {estimate.client_address && <div style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
          {estimate.client_email && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>✉ {estimate.client_email}</div>}
          {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 12 }}>📞 {estimate.client_phone}</div>}
        </div>
        <div style={{ padding: '24px 48px' }}>
          {estimate.title && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Project / Scope</div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{estimate.title}</div>
            </div>
          )}
          {estimate.assigned_to && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Prepared By</div>
              <div style={{ color: '#334155', fontSize: 13 }}>{estimate.assigned_to}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── LINE ITEMS ─────────────────────────────────────── */}
      <div style={{ padding: '28px 48px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Services &amp; Materials</div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', width: 70 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', width: 100 }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0', width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '11px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                  {item.description && <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{item.description}</div>}
                </td>
                <td style={{ padding: '11px 12px', textAlign: 'right', color: '#64748b' }}>{item.quantity?.toFixed(0) ?? '—'}</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', color: '#64748b' }}>${(item.unit_price || 0).toFixed(2)}</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No line items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ─────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 28px', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
            <span>Subtotal</span>
            <span>${(estimate.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {(estimate.tax_rate > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
              <span>Tax ({estimate.tax_rate}%)</span>
              <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', marginTop: 4, background: '#0f172a', borderRadius: 8, color: 'white' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ── NOTES ──────────────────────────────────────────── */}
      {estimate.notes && (
        <div style={{ padding: '0 48px 28px', borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Notes &amp; Terms</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{estimate.notes}</p>
        </div>
      )}

      {/* ── SIGNATURE ──────────────────────────────────────── */}
      <div style={{ margin: '0 48px', borderTop: '1px solid #e2e8f0', padding: '28px 0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div>
          <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 32, marginBottom: 8 }}></div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Authorized Signature</div>
        </div>
        <div>
          <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 32, marginBottom: 8 }}></div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Customer Signature &amp; Date</div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>FSM Pro · Portland, OR · info@fsmpro.com</div>
        <div style={{ fontSize: 11, color: '#cbd5e1' }}>Estimate #{estimate.estimate_number} · Valid 30 days from date issued</div>
      </div>

    </div>
  );
}