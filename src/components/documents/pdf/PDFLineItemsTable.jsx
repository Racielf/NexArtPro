import React from 'react';
import { COLORS, FONT, SPACE } from './PDFStyles';
import { t } from '@/lib/documentTranslations';

/**
 * PDFLineItemsTable — Professional line items table for PDF output.
 *
 * STRICT RULES:
 *   - Only client-safe columns: Description | Qty | Unit | Unit Price | Total
 *   - Never exposes book_price, unit_cost, margin, or internal data
 *   - Right-aligned prices, left-aligned descriptions
 *   - Alternating row stripes, header background
 */
export default function PDFLineItemsTable({ groups = [], showPrices = true, accent = COLORS.bid.accent, lang = 'en', variant = 'proposal' }) {
  if (!groups.length) return null;

  const ts = (key) => t('shared', key, lang);
  const isBid = variant === 'bid';

  const headerBg = COLORS.bg.tableHead;
  const headerBorder = COLORS.border.medium;
  const rowBorder = COLORS.border.light;
  const stripeBg = COLORS.bg.tableStripe;
  const groupHeaderBg = isBid ? COLORS.bid.accent : accent;

  const thBase = {
    padding: `${SPACE.md}px ${SPACE.lg}px`,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: `2px solid ${headerBorder}`,
    textAlign: 'right',
    verticalAlign: 'bottom',
  };
  const thLeft = { ...thBase, textAlign: 'left' };

  const tdBase = {
    padding: `${SPACE.md}px ${SPACE.lg}px`,
    textAlign: 'right',
    color: COLORS.text.muted,
    fontSize: FONT.size.base,
    borderBottom: `1px solid ${rowBorder}`,
    verticalAlign: 'top',
  };
  const tdLeft = { ...tdBase, textAlign: 'left', color: COLORS.text.secondary };

  return (
    <div style={{ border: `1px solid ${COLORS.border.medium}`, borderRadius: 8, overflow: 'hidden' }}>
      {groups.map((group, gi) => {
        const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
        const showGroupHeader = group.name && groups.length > 1;

        return (
          <div key={group.id || gi}>
            {/* Group header bar */}
            {showGroupHeader && (
              <div style={{
                background: groupHeaderBg,
                color: COLORS.text.inverse,
                padding: `${SPACE.sm}px ${SPACE.lg}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.bold,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                <span>{group.name}</span>
                {showPrices && (
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: FONT.weight.semibold }}>
                    ${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: headerBg }}>
                  <th style={thLeft}>{ts('description')}</th>
                  <th style={{ ...thBase, width: 52, textAlign: 'center' }}>{ts('qty')}</th>
                  <th style={{ ...thBase, width: 48, textAlign: 'center' }}>{ts('unit')}</th>
                  {showPrices && <th style={{ ...thBase, width: 96 }}>{ts('unitPrice')}</th>}
                  {showPrices && <th style={{ ...thBase, width: 108 }}>{ts('total')}</th>}
                </tr>
              </thead>
              <tbody>
                {(group.items || []).length === 0 && (
                  <tr>
                    <td colSpan={showPrices ? 5 : 3} style={{ ...tdLeft, color: COLORS.text.faint, fontStyle: 'italic', padding: `${SPACE.xl}px ${SPACE.lg}px` }}>
                      {ts('noItems')}
                    </td>
                  </tr>
                )}
                {(group.items || []).map((item, idx) => (
                  <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? COLORS.white : stripeBg }}>
                    <td style={tdLeft}>
                      <div style={{ fontWeight: FONT.weight.semibold, color: COLORS.text.primary, fontSize: FONT.size.base, lineHeight: FONT.lineHeight.snug }}>
                        {item.service_name || item.name}
                      </div>
                      {item.description && (
                        <div style={{ color: COLORS.text.muted, fontSize: FONT.size.xs, marginTop: 3, lineHeight: FONT.lineHeight.normal }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>
                      {parseFloat(item.quantity) % 1 === 0 ? parseInt(item.quantity) : item.quantity}
                    </td>
                    <td style={{ ...tdBase, textAlign: 'center', fontSize: FONT.size.sm }}>
                      {item.unit || 'ea'}
                    </td>
                    {showPrices && (
                      <td style={tdBase}>
                        ${(parseFloat(item.unit_price) || 0).toFixed(2)}
                      </td>
                    )}
                    {showPrices && (
                      <td style={{ ...tdBase, fontWeight: FONT.weight.bold, color: COLORS.text.primary }}>
                        ${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
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