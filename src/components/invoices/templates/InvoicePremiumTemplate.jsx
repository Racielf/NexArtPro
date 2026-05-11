import React from 'react';
import { formatCurrency } from '@/utils/invoiceCalc';

/**
 * InvoicePremiumTemplate — Executive-grade presentation invoice.
 * Blue gradient header with large logo, gold accent, elegant typography.
 *
 * Props: { invoice, company, derived }
 */

const P = 48;
const FONT = "'Inter', Arial, sans-serif";
const DARK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#2563eb';
const GOLD = '#d97706';
const BORDER = '#e2e8f0';

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

export default function InvoicePremiumTemplate({ invoice, company, derived }) {
  if (!invoice) return null;
  const co = company || {};
  const logoUrl = co.logo_url || co.app_logo_url || '';
  const coName  = co.displayName || co.name || '';
  const lineItems = invoice.line_items?.length
    ? invoice.line_items
    : (invoice.groups || []).flatMap(g => g.items || []);
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && (derived?.balance_due || 0) > 0;
  const isPaid = derived?.payment_status === 'paid';
  const payments = invoice.payments || [];

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.6, background: 'white', color: DARK, minWidth: 640 }}>

      {/* ─── HEADER — Blue gradient with large logo ─── */}
      <div style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #1e40af 50%, ${DARK} 100%)`, padding: `44px ${P}px 40px`, color: 'white', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {logoUrl && (
              <div style={{ width: 130, height: 130, borderRadius: 20, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '3px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <img src={logoUrl} alt={coName} style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ paddingTop: logoUrl ? 8 : 0 }}>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{coName}</div>
              {co.address && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginTop: 8, whiteSpace: 'pre-line' }}>{co.address}</div>}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginTop: 2 }}>
                {[co.email, co.phone].filter(Boolean).join(' · ')}
              </div>
              {co.license && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>License: {co.license}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)' }}>Invoice</div>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginTop: 4 }}>#{invoice.invoice_number || '—'}</div>
            {invoice.created_date && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>{fmtDate(invoice.created_date)}</div>}
            {isPaid && (
              <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)' }}>✓ Paid</div>
            )}
            {isOverdue && !isPaid && (
              <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(220,38,38,0.25)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.4)' }}>Overdue</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── GOLD ACCENT BAR ───────────────────── */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, #f59e0b, ${GOLD})` }} />

      {/* ─── BILL TO + DETAILS ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ padding: `28px ${P}px`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 10 }}>Bill To</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{invoice.client_name || '—'}</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
            {invoice.client_email && <div>{invoice.client_email}</div>}
            {invoice.client_phone && <div>{invoice.client_phone}</div>}
            {invoice.client_address && <div style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{invoice.client_address}</div>}
          </div>
        </div>
        <div style={{ padding: `28px ${P}px`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 10 }}>Invoice Details</div>
          <div style={{ fontSize: 14, lineHeight: 2.4 }}>
            {invoice.created_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontSize: 12 }}>Issue Date</span><span style={{ fontWeight: 700 }}>{fmtDate(invoice.created_date)}</span></div>}
            {invoice.due_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontSize: 12 }}>Due Date</span><span style={{ fontWeight: 700, color: isOverdue ? '#dc2626' : DARK }}>{fmtDate(invoice.due_date)}</span></div>}
            {invoice.payment_terms && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontSize: 12 }}>Terms</span><span style={{ fontWeight: 700 }}>{invoice.payment_terms}</span></div>}
          </div>
        </div>
      </div>

      {/* ─── LINE ITEMS TABLE ──────────────────── */}
      {lineItems.length > 0 && (
        <div style={{ padding: `28px ${P}px 0` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 12 }}>Scope of Work</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', background: DARK, borderRadius: '8px 0 0 0' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'white', width: 60, textTransform: 'uppercase', background: DARK }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'white', width: 100, textTransform: 'uppercase', background: DARK }}>Price</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'white', width: 120, textTransform: 'uppercase', background: DARK, borderRadius: '0 8px 0 0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={li.id || idx} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: DARK }}>{li.name}</div>
                    {li.description && <div style={{ color: MUTED, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{li.description}</div>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '14px 16px', color: '#475569', fontSize: 13 }}>{li.quantity} {li.unit || ''}</td>
                  <td style={{ textAlign: 'right', padding: '14px 16px', color: '#475569', fontSize: 13 }}>{formatCurrency(li.unit_price)}</td>
                  <td style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, fontSize: 14, color: DARK }}>{formatCurrency(li.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TOTALS ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `24px ${P}px 32px` }}>
        <div style={{ width: 320, background: '#f8fafc', borderRadius: 12, padding: '20px 24px', border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: MUTED }}>Subtotal</span><span style={{ fontWeight: 600 }}>{formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          {(invoice.discount_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#dc2626', borderBottom: `1px solid ${BORDER}` }}>
              <span>Discount</span><span style={{ fontWeight: 600 }}>-{formatCurrency(invoice.discount_amount)}</span>
            </div>
          )}
          {(invoice.tax_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#475569', borderBottom: `1px solid ${BORDER}` }}>
              <span>Tax</span><span style={{ fontWeight: 600 }}>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', marginTop: 8, borderTop: `3px solid ${ACCENT}` }}>
            <span style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em', color: DARK }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 26, color: ACCENT }}>{formatCurrency(invoice.total || 0)}</span>
          </div>
          {(derived?.amount_paid || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#059669', marginTop: 4 }}>
              <span>Paid</span><span style={{ fontWeight: 700 }}>-{formatCurrency(derived.amount_paid)}</span>
            </div>
          )}
          {(derived?.balance_due || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: 8, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>Balance Due</span>
              <span style={{ fontWeight: 900, fontSize: 22, color: '#dc2626' }}>{formatCurrency(derived.balance_due)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── PAYMENT HISTORY ───────────────────── */}
      {payments.length > 0 && (
        <div style={{ padding: `0 ${P}px 24px` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 10 }}>Payment History</div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: `1px solid ${BORDER}` }}>
            {payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: i < payments.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{(p.method || 'cash').replace(/_/g, ' ')}</span>
                  <span style={{ color: MUTED, marginLeft: 8, fontSize: 12 }}>{fmtDate(p.paid_at)}</span>
                  {p.notes && <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{p.notes}</div>}
                </div>
                <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NOTES ─────────────────────────────── */}
      {invoice.notes && (
        <div style={{ padding: `0 ${P}px 24px` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 10 }}>Notes</div>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0, background: '#fffbeb', padding: '14px 18px', borderRadius: 8, border: '1px solid #fef3c7' }}>{invoice.notes}</p>
        </div>
      )}

      {/* ─── PAYMENT METHODS ───────────────────── */}
      {co.payment_methods && (
        <div style={{ padding: `0 ${P}px 24px` }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: GOLD, marginBottom: 10 }}>Accepted Payment Methods</div>
          <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{co.payment_methods}</p>
        </div>
      )}

      {/* ─── FOOTER ────────────────────────────── */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, #f59e0b, ${GOLD})` }} />
      <div style={{ padding: `14px ${P}px`, background: DARK, color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>{co.name}{co.license ? ` · License ${co.license}` : ''}</span>
        <span>Thank you for your business</span>
      </div>
    </div>
  );
}
