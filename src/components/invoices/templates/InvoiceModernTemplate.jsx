import React from 'react';
import { formatCurrency } from '@/utils/invoiceCalc';

/**
 * InvoiceModernTemplate — SaaS-style card-based invoice.
 * Light grey bg, cards with shadows, blue accent, 120px logo.
 *
 * Props: { invoice, company, derived }
 */

const GP = 36;
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#2563eb';
const BORDER = '#e2e8f0';

const card = (extra = {}) => ({
  background: 'white', borderRadius: 12, border: `1px solid ${BORDER}`,
  boxShadow: '0 1px 6px rgba(15,23,42,0.06)', overflow: 'hidden', ...extra,
});

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

export default function InvoiceModernTemplate({ invoice, company, derived }) {
  if (!invoice) return null;
  const co = company || {};
  const lineItems = invoice.line_items?.length
    ? invoice.line_items
    : (invoice.groups || []).flatMap(g => g.items || []);
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && (derived?.balance_due || 0) > 0;
  const isPaid = derived?.payment_status === 'paid';
  const payments = invoice.payments || [];

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, background: '#f1f5f9', color: DARK, minWidth: 640, padding: GP }}>

      {/* ─── HEADER CARD ────────────────────────── */}
      <div style={{ ...card(), background: DARK, color: 'white', padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {co.logo_url && (
              <div style={{ width: 120, height: 120, borderRadius: 16, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: `2px solid ${ACCENT}` }}>
                <img src={co.logo_url} alt={co.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>{co.name}</div>
              {co.address && <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, marginTop: 4 }}>{co.address}</div>}
              <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7 }}>
                {[co.email, co.phone].filter(Boolean).join(' · ')}
              </div>
              {co.license && <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>License: {co.license}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Invoice</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 2 }}>#{invoice.invoice_number || '—'}</div>
            {invoice.created_date && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{fmtDate(invoice.created_date)}</div>}
            {isPaid && (
              <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 12, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#065f46', color: '#6ee7b7', border: '1px solid #059669' }}>PAID</div>
            )}
            {isOverdue && !isPaid && (
              <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 12, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #dc2626' }}>OVERDUE</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CLIENT + DETAILS CARDS ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{invoice.client_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
            {invoice.client_email && <div>{invoice.client_email}</div>}
            {invoice.client_phone && <div>{invoice.client_phone}</div>}
            {invoice.client_address && <div style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{invoice.client_address}</div>}
          </div>
        </div>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Invoice Details</div>
          <div style={{ fontSize: 13, lineHeight: 2.2 }}>
            {invoice.created_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Issue Date</span><span style={{ fontWeight: 600 }}>{fmtDate(invoice.created_date)}</span></div>}
            {invoice.due_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Due Date</span><span style={{ fontWeight: 600, color: isOverdue ? '#dc2626' : DARK }}>{fmtDate(invoice.due_date)}</span></div>}
            {invoice.payment_terms && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Terms</span><span style={{ fontWeight: 600 }}>{invoice.payment_terms}</span></div>}
          </div>
        </div>
      </div>

      {/* ─── LINE ITEMS CARD ───────────────────── */}
      {lineItems.length > 0 && (
        <div style={{ ...card(), marginBottom: 20 }}>
          <div style={{ background: DARK, color: 'white', padding: '9px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Items</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: MUTED, width: 60, textTransform: 'uppercase' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 10, fontWeight: 700, color: MUTED, width: 100, textTransform: 'uppercase' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '10px 24px', fontSize: 10, fontWeight: 700, color: MUTED, width: 110, textTransform: 'uppercase' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={li.id || idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ fontWeight: 600, color: DARK }}>{li.name}</div>
                    {li.description && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{li.description}</div>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#475569' }}>{li.quantity} {li.unit || ''}</td>
                  <td style={{ textAlign: 'right', padding: '12px 20px', color: '#475569' }}>{formatCurrency(li.unit_price)}</td>
                  <td style={{ textAlign: 'right', padding: '12px 24px', fontWeight: 700, color: DARK }}>{formatCurrency(li.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TOTALS + BALANCE CARD ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isPaid || (derived?.balance_due || 0) > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ ...card(), padding: '22px 24px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
            <span>Subtotal</span><span>{formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          {(invoice.discount_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#dc2626', borderBottom: '1px solid #f1f5f9' }}>
              <span>Discount</span><span>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
          )}
          {(invoice.tax_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
              <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 6, borderTop: `3px solid ${DARK}` }}>
            <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 22 }}>{formatCurrency(invoice.total || 0)}</span>
          </div>
        </div>

        {/* Balance or paid badge */}
        {(derived?.balance_due || 0) > 0 && !isPaid && (
          <div style={{ ...card(), padding: '22px 24px', background: '#fef2f2', border: '1.5px solid #dc2626' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#dc2626', marginBottom: 8 }}>Balance Due</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>{formatCurrency(derived.balance_due)}</div>
            {(derived?.amount_paid || 0) > 0 && <div style={{ fontSize: 12, color: '#059669', marginTop: 8 }}>Paid: {formatCurrency(derived.amount_paid)}</div>}
            {isOverdue && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 6, fontWeight: 600 }}>⚠ Payment is overdue</div>}
          </div>
        )}
        {isPaid && (
          <div style={{ ...card(), padding: '22px 24px', background: '#ecfdf5', border: '1.5px solid #059669' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#059669', marginBottom: 8 }}>Payment Status</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', lineHeight: 1 }}>PAID IN FULL</div>
            <div style={{ fontSize: 12, color: '#065f46', marginTop: 8 }}>Total: {formatCurrency(derived?.amount_paid || invoice.total || 0)}</div>
          </div>
        )}
      </div>

      {/* ─── PAYMENT HISTORY ───────────────────── */}
      {payments.length > 0 && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Payment History</div>
          {payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 12, borderBottom: i < payments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div>
                <span style={{ fontWeight: 600, color: DARK, textTransform: 'capitalize' }}>{(p.method || 'cash').replace(/_/g, ' ')}</span>
                <span style={{ color: MUTED, marginLeft: 8 }}>{fmtDate(p.paid_at)}</span>
                {p.notes && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{p.notes}</div>}
              </div>
              <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── NOTES ─────────────────────────────── */}
      {invoice.notes && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20, borderLeft: `4px solid ${ACCENT}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{invoice.notes}</p>
        </div>
      )}

      {/* ─── PAYMENT METHODS ───────────────────── */}
      {co.payment_methods && (
        <div style={{ ...card(), padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Accepted Payment Methods</div>
          <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{co.payment_methods}</p>
        </div>
      )}

      {/* ─── FOOTER ────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '12px 0 0', opacity: 0.4 }}>
        <div style={{ fontSize: 8, color: '#475569', letterSpacing: '0.06em' }}>
          {co.name}{co.address ? ` · ${co.address}` : ''}{co.license ? ` · License ${co.license}` : ''} · {fmtDate(invoice.created_date)}
        </div>
      </div>
    </div>
  );
}
