import React from 'react';

/**
 * SharedLineItemsTable — Shared line items renderer for BID & PROPOSAL
 *
 * Shows ONLY client-safe columns: Qty | Description | Unit Price | Total
 * Never exposes book_price, unit_cost, margin, or internal warnings.
 *
 * Uses the same data structure (groups → items) from the shared estimate engine.
 */
export default function SharedLineItemsTable({ groups = [], showPrices = true, accent = '#0f172a' }) {
  if (!groups.length) return null;

  const thStyle = {
    textAlign: 'right',
    padding: '10px 14px',
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '2px solid #e2e8f0',
  };
  const thLeft = { ...thStyle, textAlign: 'left' };

  const tdStyle = {
    padding: '11px 14px',
    textAlign: 'right',
    color: '#475569',
    fontSize: 12,
    borderBottom: '1px solid #f1f5f9',
  };
  const tdLeft = { ...tdStyle, textAlign: 'left' };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      {groups.map((group, gi) => {
        const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
        const showGroupHeader = group.name && groups.length > 1;

        return (
          <div key={group.id || gi}>
            {showGroupHeader && (
              <div style={{ background: accent, color: 'white', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span>{group.name}</span>
                {showPrices && <span style={{ color: 'rgba(255,255,255,0.7)' }}>${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thLeft}>Description</th>
                  <th style={{ ...thStyle, width: 55 }}>Qty</th>
                  <th style={{ ...thStyle, width: 50 }}>Unit</th>
                  {showPrices && <th style={{ ...thStyle, width: 100 }}>Unit Price</th>}
                  {showPrices && <th style={{ ...thStyle, width: 110 }}>Total</th>}
                </tr>
              </thead>
              <tbody>
                {(group.items || []).length === 0 && (
                  <tr><td colSpan={showPrices ? 5 : 3} style={{ ...tdLeft, color: '#94a3b8', fontStyle: 'italic', padding: '16px 14px' }}>No items</td></tr>
                )}
                {(group.items || []).map((item, idx) => (
                  <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={tdLeft}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{item.service_name || item.name}</div>
                      {item.description && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2, lineHeight: 1.5 }}>{item.description}</div>}
                    </td>
                    <td style={tdStyle}>{parseFloat(item.quantity) % 1 === 0 ? parseInt(item.quantity) : item.quantity}</td>
                    <td style={tdStyle}>{item.unit || 'ea'}</td>
                    {showPrices && <td style={tdStyle}>${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>}
                    {showPrices && <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}