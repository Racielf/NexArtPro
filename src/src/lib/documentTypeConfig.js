/**
 * documentTypeConfig.js — Shared document type configuration
 *
 * Centralizes all label, validation, and presentation differences
 * between BID and PROPOSAL document types.
 *
 * The pricing engine, line item logic, and calculations are SHARED.
 * Only labels, required fields, and presentation hints vary.
 */

export const DOC_TYPES = {
  BID: 'BID',
  PROPOSAL: 'PROPOSAL',
  ESTIMATE: 'ESTIMATE',
};

export const DOC_TYPE_OPTIONS = [
  { value: DOC_TYPES.BID, label: 'Bid' },
  { value: DOC_TYPES.PROPOSAL, label: 'Proposal' },
];

/**
 * Get configuration for a given document_type.
 * Falls back to PROPOSAL if type is unknown/null (backward compat).
 */
export function getDocTypeConfig(documentType) {
  const type = documentType || DOC_TYPES.ESTIMATE;

  if (type === DOC_TYPES.BID) {
    return {
      type: DOC_TYPES.BID,
      // Labels
      label: 'Bid',
      labelUpper: 'BID',
      labelPlural: 'Bids',
      abbreviation: 'BID',
      numberLabel: 'Bid #',
      documentTitle: 'Bid',
      // Presentation
      tone: 'technical',        // technical/commercial bidding
      prioritize: 'scope',      // scope clarity, specs, reference info
      // Required fields
      requiresJobRef: true,     // must have job_number OR plan_reference
      // Validation message
      jobRefValidationMsg: 'Bids require a Job Number or Plan Reference before sending.',
      // Section labels
      scopeLabel: 'Scope of Work',
      inclusionsLabel: 'Inclusions',
      exclusionsLabel: 'Exclusions',
      notesLabel: 'Bid Notes',
      internalNotesLabel: 'Internal Notes',
    };
  }

  if (type === DOC_TYPES.PROPOSAL) {
    return {
      type: DOC_TYPES.PROPOSAL,
      label: 'Proposal',
      labelUpper: 'PROPOSAL',
      labelPlural: 'Proposals',
      abbreviation: 'PROP',
      numberLabel: 'Proposal #',
      documentTitle: 'Proposal',
      tone: 'client-friendly',
      prioritize: 'trust',
      requiresJobRef: false,
      jobRefValidationMsg: '',
      scopeLabel: 'Scope of Work',
      inclusionsLabel: "What's Included",
      exclusionsLabel: "What's Excluded",
      notesLabel: 'Customer Notes',
      internalNotesLabel: 'Internal Notes',
    };
  }

  // ESTIMATE (default fallback for null, undefined, or unknown types)
  return {
    type: DOC_TYPES.ESTIMATE,
    label: 'Estimate',
    labelUpper: 'ESTIMATE',
    labelPlural: 'Estimates',
    abbreviation: 'EST',
    numberLabel: 'Estimate #',
    documentTitle: 'Estimate',
    tone: 'client-friendly',
    prioritize: 'trust',
    requiresJobRef: false,
    jobRefValidationMsg: '',
    scopeLabel: 'Scope of Work',
    inclusionsLabel: "What's Included",
    exclusionsLabel: "What's Excluded",
    notesLabel: 'Notes',
    internalNotesLabel: 'Internal Notes',
  };
}

/**
 * Validate document-type-specific required fields.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateDocTypeFields(estimate) {
  const config = getDocTypeConfig(estimate?.document_type);
  const errors = [];

  if (config.requiresJobRef) {
    const hasJobNumber = !!(estimate?.job_number?.trim());
    const hasPlanRef   = !!(estimate?.plan_reference?.trim());
    if (!hasJobNumber && !hasPlanRef) {
      errors.push(config.jobRefValidationMsg);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}