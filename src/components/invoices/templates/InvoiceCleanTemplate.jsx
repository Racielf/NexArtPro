import React from 'react';
import { formatCurrency } from '@/utils/invoiceCalc';

/**
 * InvoiceCleanTemplate — Modern professional invoice with large logo.
 * Dark navy header, clean table, slate palette. Logo up to 120px.
 *
 * Props: { invoice, company, derived }
 */

const P = 44;
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const LIGHT_BG = '#f8fafc';

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

export default function InvoiceCleanTemplate({ invoice, company, derived }) {
  if (!invoice) return null;
  const co = company || {};
  const lineItems = invoice.line_items || [];
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && (derived?.balance_due || 0) > 0;
  const isPaid = derived?.payment_status === 'paid';
  const payments = invoice.payments || [];

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, background: 'white', color: DARK, minWidth: 640 }}>

      {/* ─── HEADER ─────────────────────────────── */}
      <div style={{ background: DARK, padding: `36px ${P}px 32px`, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {co.logo_url && (
              <div style={{ width: 120, height: 120, borderRadius: 16, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '2px solid #3b82f6' }}>
                <img src={co.logo_url} alt={co.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>{co.name}</div>
              {co.address && <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, marginTop: 6 }}>{co.address}</div>}
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
                {[co.email, co.phone].filter(Boolean).join(' · ')}
              </div>
              {co.license && <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>License: {co.license}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Invoice</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', marginTop: 4 }}>#{invoice.invoice_number || '—'}</div>
            {invoice.created_date && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{fmtDate(invoice.created_date)}</div>}
            {isPaid && (
              <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#065f46', color: '#6ee7b7' }}>PAID</div>
            )}
            {isOverdue && !isPaid && (
              <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#7f1d1d', color: '#fca5a5' }}>OVERDUE</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BILL TO + DATES ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: `24px ${P}px`, borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 8 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{invoice.client_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
            {invoice.client_email && <div>{invoice.client_email}</div>}
            {invoice.client_phone && <div>{invoice.client_phone}</div>}
            {invoice.client_address && <div style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{invoice.client_address}</div>}
          </div>
        </div>
        <div style={{ padding: `24px ${P}px` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 8 }}>Invoice Details</div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            {invoice.created_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Issue Date</span><span style={{ fontWeight: 600 }}>{fmtDate(invoice.created_date)}</span></div>}
            {invoice.due_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Due Date</span><span style={{ fontWeight: 600, color: isOverdue ? '#dc2626' : DARK }}>{fmtDate(invoice.due_date)}</span></div>}
            {invoice.payment_terms && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED }}>Terms</span><span style={{ fontWeight: 600 }}>{invoice.payment_terms}</span></div>}
          </div>
        </div>
      </div>

      {/* ─── LINE ITEMS TABLE ──────────────────── */}
      {lineItems.length > 0 && (
        <div style={{ padding: `24px ${P}px 0` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: LIGHT_BG }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `2px solid ${BORDER}` }}>Description</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: MUTED, width: 60, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: MUTED, width: 100, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Price</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: MUTED, width: 110, textTransform: 'uppercase', borderBottom: `2px solid ${BORDER}` }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={li.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: DARK }}>{li.name}</div>
                    {li.description && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{li.description}</div>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 14px', color: MUTED }}>{li.quantity} {li.unit || ''}</td>
                  <td style={{ textAlign: 'right', padding: '12px 14px', color: MUTED }}>{formatCurrency(li.unit_price)}</td>
                  <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: DARK }}>{formatCurrency(li.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TOTALS ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `20px ${P}px 28px` }}>
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: DARK, borderBottom: '1px solid #f1f5f9' }}>
            <span>Subtotal</span><span>{formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          {(invoice.discount_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#dc2626', borderBottom: '1px solid #f1f5f9' }}>
              <span>Discount</span><span>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
          )}
          {(invoice.tax_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: MUTED, borderBottom: '1px solid #f1f5f9' }}>
              <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 6, borderTop: `3px solid ${DARK}` }}>
            <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 22 }}>{formatCurrency(invoice.total || 0)}</span>
          </div>
          {(derived?.amount_paid || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#059669', marginTop: 4 }}>
              <span>Paid</span><span>-{formatCurrency(derived.amount_paid)}</span>
            </div>
          )}
          {(derived?.balance_due || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: `2px solid #dc2626`, marginTop: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#dc2626' }}>Balance Due</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: '#dc2626' }}>{formatCurrency(derived.balance_due)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── PAYMENTS ──────────────────────────── */}
      {payments.length > 0 && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#334155', marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${BORDER}` }}>Payment History</div>
          {payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: MUTED }}>{fmtDate(p.paid_at) || '—'} · <span style={{ textTransform: 'capitalize' }}>{(p.method || 'cash').replace(/_/g, ' ')}</span></span>
              <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── NOTES ─────────────────────────────── */}
      {invoice.notes && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#334155', marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${BORDER}` }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{invoice.notes}</p>
        </div>
      )}

      {/* ─── PAYMENT METHODS ───────────────────── */}
      {co.payment_methods && (
        <div style={{ padding: `0 ${P}px 20px` }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#334155', marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${BORDER}` }}>Accepted Payment Methods</div>
          <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{co.payment_methods}</p>
        </div>
      )}

      {/* ─── FOOTER ────────────────────────────── */}
      <div style={{ padding: `10px ${P}px`, borderTop: `1px solid ${BORDER}`, background: LIGHT_BG, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
        <span>{co.name}{co.license ? ` · License ${co.license}` : ''}</span>
        <span>{fmtDate(invoice.created_date)}</span>
      </div>
    </div>
  );
}
