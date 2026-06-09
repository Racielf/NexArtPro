import React from 'react';
import BidDocumentRenderer from './BidDocumentRenderer';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

/**
 * DocumentTypeRenderer — Unified entry point for document rendering.
 *
 * Explicit routing by document_type:
 *   BID      → BidDocumentRenderer (specialized technical layout)
 *   PROPOSAL → EstimateTemplateRenderer with documentType="proposal"
 *   ESTIMATE → EstimateTemplateRenderer with documentType="estimate"
 *   default  → EstimateTemplateRenderer with documentType="estimate"
 */
export default function DocumentTypeRenderer({ estimate, options = {}, lang, template }) {
  if (!estimate) return null;

  const resolvedLang = lang || estimate?.document_language || 'en';
  const mergedOpts = { ...DEFAULT_OPTIONS, ...options };
  const docType = estimate.document_type;

  if (docType === 'BID') {
    return <BidDocumentRenderer estimate={estimate} options={mergedOpts} lang={resolvedLang} />;
  }

  const resolvedTemplate = template || estimate?.document_config?.template || 'clean';

  // PROPOSAL and ESTIMATE are both rendered via EstimateTemplateRenderer,
  // but each is explicitly identified — Proposal does NOT fall through as Estimate.
  const documentType = docType === 'PROPOSAL' ? 'proposal' : 'estimate';

  return (
    <EstimateTemplateRenderer
      estimate={estimate}
      template={resolvedTemplate}
      options={mergedOpts}
      documentType={documentType}
    />
  );
}