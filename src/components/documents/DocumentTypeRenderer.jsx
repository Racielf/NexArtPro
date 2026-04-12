import React from 'react';
import BidDocumentRenderer from './BidDocumentRenderer';
import EstimateTemplateRenderer from '@/components/estimates/EstimateTemplateRenderer';
import { DEFAULT_OPTIONS } from '@/lib/estimateTemplates';

/**
 * DocumentTypeRenderer — Unified entry point for document rendering.
 *
 * BID documents → BidDocumentRenderer (specialized technical layout)
 * All other documents (PROPOSAL, default) → EstimateTemplateRenderer
 *   which respects the selected template (clean / premium / modern_card)
 */
export default function DocumentTypeRenderer({ estimate, options = {}, lang, template }) {
  if (!estimate) return null;

  const resolvedLang = lang || estimate?.document_language || 'en';
  const mergedOpts = { ...DEFAULT_OPTIONS, ...options };

  if (estimate.document_type === 'BID') {
    return <BidDocumentRenderer estimate={estimate} options={mergedOpts} lang={resolvedLang} />;
  }

  const resolvedTemplate = template || estimate?.document_config?.template || 'clean';

  return (
    <EstimateTemplateRenderer
      estimate={estimate}
      template={resolvedTemplate}
      options={mergedOpts}
      documentType="estimate"
    />
  );
}