/**
 * Adapter: Proposal items[] ↔ EstimateGroups format
 * 
 * Permite usar EstimateGroups sin cambiar el schema de Proposal.
 * items[] permanece intacto en backend.
 */

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Convierte proposal.items[] → groups[] (EstimateGroups format)
 */
export function mapItemsToGroups(items = []) {
  return [
    {
      id: 'default-group',
      name: 'Services',
      collapsed: false,
      items: items.map(item => ({
        ...item,
        unit_cost: item.unit_cost ?? 0,
        taxable: item.taxable ?? true,
      })),
    },
  ];
}

/**
 * Convierte groups[] → items[] (Proposal format)
 * Flattens groups back to flat array for backend persistence
 */
export function mapGroupsToItems(groups = []) {
  return groups.flatMap(group =>
    (group.items || []).map(item => ({
      id: item.id,
      service_name: item.service_name || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      unit: item.unit || 'ea',
      book_price: item.book_price || 0,
      unit_price: item.unit_price || 0,
      unit_cost: item.unit_cost || 0,
      line_total: item.line_total || 0,
      taxable: item.taxable ?? true,
    }))
  );
}

/**
 * Creates a mock "estimate" object that EstimateGroups expects
 * from a Proposal, without modifying the original
 */
export function createEstimateProxy(proposal) {
  return {
    id: proposal.id,
    estimate_number: proposal.proposal_number,
    title: proposal.title,
    groups: mapItemsToGroups(proposal.items),
    tax_rate: proposal.tax_rate || 0,
    discount_type: proposal.discount_type || 'fixed',
    discount_value: proposal.discount_value || 0,
    deposit_percent: 0, // Proposals don't have deposits typically
    expiration_date: proposal.expiration_date || '',
    notes: proposal.notes || '',
    internal_notes: proposal.internal_notes || '',
    exclusions: proposal.exclusions || '',
    warranty_terms: '',
    payment_terms: proposal.payment_terms || '',
    legal_terms: proposal.legal_terms || '',
  };
}

/**
 * Converts EstimateGroups output → Proposal update payload
 * Extracts only fields that Proposal needs
 */
export function extractProposalChanges(estimateData) {
  return {
    items: mapGroupsToItems(estimateData.groups),
    subtotal: estimateData.subtotal || 0,
    tax_rate: estimateData.tax_rate || 0,
    tax_amount: estimateData.tax_amount || 0,
    discount_value: estimateData.discount_value || 0,
    total_amount: estimateData.total || 0,
    payment_terms: estimateData.payment_terms || '',
    legal_terms: estimateData.legal_terms || '',
    notes: estimateData.notes || '',
    internal_notes: estimateData.internal_notes || '',
    expiration_date: estimateData.expiration_date || '',
  };
}