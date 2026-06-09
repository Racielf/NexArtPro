import React from 'react';

const fmt = (n) => `$${(parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const today = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * PaymentReceiptRenderer
 * Professional payment receipt — inline styles only (print-safe).
 *
 * Props:
 *   receipt — object built by buildReceipt() from paymentReceiptUtils
 */
export default function PaymentReceiptRenderer({ receipt }) {
  if (!receipt) return null;

  const {
    receipt_number,
    payment_date,
    invoice_number,
    customer_name,
    customer_address,
    customer_email,
    customer_phone,
    payment_method,
    amount_paid,
    previous_balance,
    remaining_balance,
    notes,
    status_label,
    _status_style,
  } = receipt;

  const statusStyle = _status_style || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  const isPaidFull  = remaining_balance <= 0;

  return (
    <div id="payment-receipt-doc" style={{
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      fontSize: 13,
      color: '#0f172a',
      background: '#fff',
      maxWidth: 680,
      margin: '0 auto',
      lineHeight: 1.5,
    }}>
      {/* ── HEADER ── */}
      <div style={{ background: '#0f172a', padding: '36px 48px 30px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 40 40" width="26" height="26" fill="none">
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px' }}>FSM Pro</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Field Service Management</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
              Portland, OR 97201<br />
              info@fsmpro.com · (503) 555-0100
            </div>
          </div>

          {/* Receipt ID block */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              Payment Receipt
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              #{receipt_number}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{payment_date || today()}</div>
            {invoice_number && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                Invoice #{invoice_number}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STATUS BANNER ── */}
      <div style={{
        background: statusStyle.bg,
        borderBottom: `2px solid ${statusStyle.border}`,
        padding: '10px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: statusStyle.color }}>
          {status_label}
        </span>
        <span style={{ fontWeight: 800, fontSize: 20, color: statusStyle.color }}>
          {fmt(amount_paid)} received
        </span>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '32px 48px' }}>

        {/* Two-col: Received From + Payment Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>

          {/* Received From */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
              Received From
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{customer_name}</div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
              {customer_address && <div>{customer_address}</div>}
              {customer_email   && <div>✉ {customer_email}</div>}
              {customer_phone   && <div>📞 {customer_phone}</div>}
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
              Payment Details
            </div>
            <div style={{ fontSize: 12, color: '#334155', lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Method</span>
                <span style={{ fontWeight: 600 }}>{payment_method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: 600 }}>{payment_date || today()}</span>
              </div>
              {invoice_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Invoice</span>
                  <span style={{ fontWeight: 600 }}>#{invoice_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FINANCIAL SUMMARY ── */}
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
            Financial Summary
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
              <span>Previous Balance</span>
              <span style={{ fontWeight: 600 }}>{fmt(previous_balance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
              <span>Amount Paid</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>−{fmt(amount_paid)}</span>
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Remaining Balance</span>
              <span style={{
                fontWeight: 800,
                fontSize: 18,
                color: isPaidFull ? '#16a34a' : '#dc2626',
              }}>
                {isPaidFull ? '$0.00' : fmt(remaining_balance)}
              </span>
            </div>
          </div>
        </div>

        {/* ── NOTES ── */}
        {notes && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              Notes
            </div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{notes}</p>
          </div>
        )}

        {/* ── THANK YOU ── */}
        <div style={{ textAlign: 'center', padding: '20px 0 4px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
            Thank you for your payment. This receipt confirms we have received your funds.
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '14px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        color: '#94a3b8',
      }}>
        <span>FSM Pro · Portland, OR 97201</span>
        <span>Generated {today()}</span>
      </div>
    </div>
  );
}