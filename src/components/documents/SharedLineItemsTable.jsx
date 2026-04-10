import React from 'react';
import PDFLineItemsTable from './pdf/PDFLineItemsTable';

/**
 * SharedLineItemsTable — Thin wrapper that delegates to PDFLineItemsTable.
 * Maintains backward compatibility for all existing consumers.
 */
export default function SharedLineItemsTable({ groups = [], showPrices = true, accent = '#0f172a', lang = 'en', variant = 'proposal' }) {
  return <PDFLineItemsTable groups={groups} showPrices={showPrices} accent={accent} lang={lang} variant={variant} />;
}