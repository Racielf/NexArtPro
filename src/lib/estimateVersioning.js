/**
 * estimateVersioning.js — Version tracking and edit lock enforcement
 * Minimal implementation: no versioning UI, no history storage
 */

/**
 * Check if estimate is locked for editing
 * Locked if status is: sent, viewed, approved, declined
 */
export function isEstimateLocked(estimate) {
  if (!estimate) return false;
  const lockedStatuses = ['sent', 'viewed', 'approved', 'declined'];
  return lockedStatuses.includes(estimate.status);
}

/**
 * Create new version from locked estimate
 * Copies all content fields, sets status=draft, increments version_number
 */
export async function createNewVersionFromEstimate(estimate, base44) {
  if (!estimate || !base44) return null;

  const newVersion = {
    // Metadata
    version_number: (estimate.version_number || 1) + 1,
    parent_estimate_id: estimate.id,
    status: 'draft',
    
    // Client & reference
    client_id: estimate.client_id,
    client_name: estimate.client_name,
    client_email: estimate.client_email,
    client_phone: estimate.client_phone,
    client_address: estimate.client_address,
    
    // Document type + language
    document_type: estimate.document_type || 'PROPOSAL',
    document_language: estimate.document_language || 'en',
    
    // Content
    title: estimate.title,
    groups: JSON.parse(JSON.stringify(estimate.groups || [])),
    line_items: JSON.parse(JSON.stringify(estimate.line_items || [])),
    materials: JSON.parse(JSON.stringify(estimate.materials || [])),
    other_costs: JSON.parse(JSON.stringify(estimate.other_costs || [])),
    
    // Pricing
    subtotal: estimate.subtotal,
    discount_type: estimate.discount_type,
    discount_value: estimate.discount_value,
    discount_amount: estimate.discount_amount,
    deposit_percent: estimate.deposit_percent,
    tax_rate: estimate.tax_rate,
    total: estimate.total,
    
    // Scope & terms
    notes: estimate.notes,
    internal_notes: estimate.internal_notes,
    exclusions: estimate.exclusions,
    warranty_terms: estimate.warranty_terms,
    payment_terms: estimate.payment_terms,
    legal_terms: estimate.legal_terms,
    scope_summary: estimate.scope_summary,
    assumptions: estimate.assumptions,
    change_request_policy: estimate.change_request_policy,
    included_scope_bullets: estimate.included_scope_bullets,
    
    // Contingency
    contingency_type: estimate.contingency_type,
    contingency_value: estimate.contingency_value,
    contingency_amount: estimate.contingency_amount,
    show_contingency_to_client: estimate.show_contingency_to_client,
    uncertainty_note: estimate.uncertainty_note,
    
    // Attachments
    attachments: JSON.parse(JSON.stringify(estimate.attachments || [])),
    
    // Document config
    document_config: JSON.parse(JSON.stringify(estimate.document_config || {})),
    
    // BID fields
    job_number: estimate.job_number,
    plan_reference: estimate.plan_reference,
  };

  try {
    const created = await base44.entities.Estimate.create(newVersion);
    return created;
  } catch (err) {
    console.error('[createNewVersionFromEstimate] failed:', err?.message);
    return null;
  }
}