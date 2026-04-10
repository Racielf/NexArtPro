import React from 'react';
import BidDocumentRenderer from './BidDocumentRenderer';
import ProposalDocumentRenderer from './ProposalDocumentRenderer';

/**
 * DocumentTypeRenderer — Presentation router for BID vs PROPOSAL
 *
 * This is the entry point for document-type-aware rendering.
 * It reads the estimate's document_type and delegates to the
 * appropriate presentation component.
 *
 * SHARED:  pricing engine, line item data, totals, financial calculations
 * DIFFERENT: section order, section labels, visual tone, required fields
 *
 * Usage:
 *   <DocumentTypeRenderer estimate={estimate} options={options} />
 */
export default function DocumentTypeRenderer({ estimate, options = {} }) {
  if (!estimate) return null;

  const docType = estimate.document_type || 'PROPOSAL';

  if (docType === 'BID') {
    return <BidDocumentRenderer estimate={estimate} options={options} />;
  }

  return <ProposalDocumentRenderer estimate={estimate} options={options} />;
}