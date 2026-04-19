/**
 * proposalDocumentMapper.js
 *
 * Maps Proposal entity data → "estimate" shape expected by
 * DocumentTypeRenderer (BidDocumentRenderer / ProposalDocumentRenderer).
 *
 * CRITICAL SECURITY:
 *   - NEVER includes book_price, unit_cost, margin, or internal helpers.
 *   - Only client-safe fields are mapped.
 *
 * Used by: ProposalPreviewModal, print flow, download flow.
 */

/**
 * Resolve proposalDetails with priority:
 *   1. overrideDetails (from editor state — always wins)
 *   2. proposal.proposal_details (dedicated structured field — primary storage)
 *   3. Legacy: JSON-in-notes fallback (one-time migration read path only)
 */
function parseProposalDetails(proposal, overrideDetails) {
  if (overrideDetails && Object.values(overrideDetails).some(v => v)) {
    return overrideDetails;
  }
  if (proposal?.proposal_details && Object.values(proposal.proposal_details).some(v => v)) {
    return proposal.proposal_details;
  }
  // Legacy fallback: attempt to read from old JSON-in-notes (read only, never write)
  if (proposal?.notes) {
    try {
      const parsed = typeof proposal.notes === 'string' ? JSON.parse(proposal.notes) : proposal.notes;
      if (parsed?.proposalDetails) return parsed.proposalDetails;
    } catch {
      // notes is plain text — not a JSON blob
    }
  }
  return {};
}

/**
 * mapProposalToEstimate(proposal, proposalDetails?)
 *
 * Returns an object shaped like an Estimate record, safe for
 * BidDocumentRenderer / ProposalDocumentRenderer.
 *
 * @param {Object} proposal         - The Proposal entity record
 * @param {Object} [proposalDetails] - Optional override (from editor state)
 * @returns {Object} estimate-shaped object for document renderers
 */
export function mapProposalToEstimate(proposal, proposalDetails, language) {
  if (!proposal) return null;

  const details = parseProposalDetails(proposal, proposalDetails);

  // Resolve language: explicit param > proposal field > 'en'
  const resolvedLang = language || proposal?.document_language || 'en';

  // Map flat items[] → groups[] (client-safe: structural fields preserved, no cost data)
  const groups = [{
    id: 'proposal-items',
    name: null, // single unnamed group — renderers handle gracefully
    items: (proposal.items || []).map(item => ({
      id: item.id,
      service_id: (typeof item.service_id === 'string' && item.service_id.length > 0) ? item.service_id : null,
      service_name: item.service_name || item.name || '(unnamed)',
      category: item.category || 'Misc',
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'ea',
      unit_price: parseFloat(item.unit_price) || 0,
      line_total: parseFloat(item.line_total) || parseFloat(item.total_price) || 0,
      taxable: item.taxable !== false,
      // Explicitly NO: unit_cost, book_price, margin (client-facing doc)
    })),
  }];

  return {
    // Identity
    estimate_number: proposal.proposal_number,
    document_type: 'PROPOSAL', // Always PROPOSAL for proposals
    document_language: resolvedLang,

    // Client info
    client_name: proposal.client_name || '',
    client_email: proposal.client_email || '',
    client_phone: proposal.client_phone || '',
    client_address: proposal.client_address || '',

    // Project info
    title: proposal.title || '',

    // Scope → notes (used by ProposalDocumentRenderer cover note / project summary)
    notes: details.scopeOfWork || '',

    // Line items
    groups,

    // Financials (client-safe totals only)
    subtotal: parseFloat(proposal.subtotal) || 0,
    discount_type: proposal.discount_type || 'fixed',
    discount_value: parseFloat(proposal.discount_value) || 0,
    discount_amount: parseFloat(proposal.discount_value) || 0,
    tax_rate: parseFloat(proposal.tax_rate) || 0,
    tax_amount: parseFloat(proposal.tax_amount) || 0,
    total: parseFloat(proposal.total_amount) || 0,
    deposit_percent: 0,
    deposit_amount: 0,

    // Terms — map proposalDetails fields into the estimate shape
    exclusions: details.exclusions || '',
    warranty_terms: '',
    payment_terms: details.inclusions
      ? `What's Included:\n${details.inclusions}`
      : (proposal.payment_terms || ''),
    legal_terms: proposal.legal_terms || '',

    // Dates
    expiration_date: proposal.expiration_date || '',
    project_start_date: details.timeline || '',
    project_end_date: '',

    // Status
    status: proposal.status || 'draft',

    // Document config (renderers use this for template + options)
    document_config: {
      template: proposal.template_name || 'professional',
      options: {
        showPrices: true,
        showBreakdown: true,
        showTerms: true,
        showSignatures: true,
        hideInternalNotes: true,
      },
    },
  };
}