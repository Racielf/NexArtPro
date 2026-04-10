/**
 * Adapter: Proposal items[] ↔ EstimateGroups format
 * 
 * HARDENED VERSION: Prevents field contamination, NaN, and unsafe conversions.
 * Proposal.items[] persists ONLY: id, service_name, description, quantity, unit, 
 * book_price, unit_price, line_total
 * 
 * EstimateGroups-internal fields (unit_cost, taxable, etc) exist ONLY in the
 * adapted groups[] format, NOT in persisted Proposal.items[]
 */

// ─── SAFE CONVERSION UTILITIES ────────────────────────────────────────────────
// Protect against NaN, undefined, null, and invalid data types

const toSafeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
};

const toSafeString = (val, fallback = '') => {
  return typeof val === 'string' ? val.trim() : fallback;
};

const calculateSafeLineTotal = (item) => {
  const qty = toSafeNumber(item.quantity, 1);
  const price = toSafeNumber(item.unit_price, 0);
  const total = qty * price;
  return toSafeNumber(total, 0);
};

// ─── PUBLIC ADAPTERS ──────────────────────────────────────────────────────────

/**
 * Convierte proposal.items[] → groups[] (EstimateGroups format)
 * 
 * Adapta campos de Proposal a lo que EstimateGroups espera.
 * Campos extra (unit_cost, taxable) se agregan SOLO para render,
 * NO se persisten de vuelta a Proposal.
 */
export function mapItemsToGroups(items = []) {
  return [
    {
      id: 'default-group',
      name: 'Services',
      collapsed: false,
      items: (items || []).map(item => ({
        // ✅ Proposal fields: normalized + safe
        id: item.id,
        service_name: toSafeString(item.service_name),
        description: toSafeString(item.description),
        quantity: toSafeNumber(item.quantity, 1),
        unit: toSafeString(item.unit, 'ea'),
        book_price: toSafeNumber(item.book_price, 0),
        unit_price: toSafeNumber(item.unit_price, 0),
        line_total: toSafeNumber(item.line_total, 0),
        
        // ⚠️ EstimateGroups render-only fields (NOT persisted back)
        unit_cost: toSafeNumber(item.unit_cost, 0),
        taxable: item.taxable ?? true,
      })),
    },
  ];
}

/**
 * Convierte groups[] → items[] (Proposal format)
 * 
 * CRÍTICO: Filtra SOLO campos que Proposal debe persistir.
 * Excluye unit_cost, taxable, y otros campos internos de EstimateGroups.
 * Recalcula line_total si viene inválido.
 */
export function mapGroupsToItems(groups = []) {
  return (groups || []).flatMap(group =>
    (group.items || []).map(item => {
      // ✅ ONLY Proposal-allowed fields
      const cleaned = {
        id: item.id,
        service_name: toSafeString(item.service_name),
        description: toSafeString(item.description),
        quantity: toSafeNumber(item.quantity, 1),  // Default 1, not 0
        unit: toSafeString(item.unit, 'ea'),
        book_price: toSafeNumber(item.book_price, 0),
        unit_price: toSafeNumber(item.unit_price, 0),
        line_total: calculateSafeLineTotal(item),  // Recalculate if invalid
      };
      
      // 🔴 Explicitly exclude EstimateGroups-internal fields
      // These should NEVER be persisted to Proposal.items[]
      delete cleaned.unit_cost;
      delete cleaned.taxable;
      delete cleaned.category;
      delete cleaned.collapsed;
      delete cleaned._service_id;
      delete cleaned._from_picker;
      delete cleaned._is_new;
      
      return cleaned;
    })
  );
}

/**
 * Creates a mock "estimate" object that EstimateGroups expects
 * from a Proposal, without modifying the original.
 * 
 * Handles missing Proposal fields with safe defaults.
 */
export function createEstimateProxy(proposal) {
  return {
    id: proposal.id,
    estimate_number: proposal.proposal_number,
    title: toSafeString(proposal.title),
    groups: mapItemsToGroups(proposal.items),
    tax_rate: toSafeNumber(proposal.tax_rate, 0),
    discount_type: toSafeString(proposal.discount_type, 'fixed'),  // Fallback if not set
    discount_value: toSafeNumber(proposal.discount_value, 0),
    deposit_percent: 0,  // Proposals don't use deposits
    expiration_date: toSafeString(proposal.expiration_date),
    notes: toSafeString(proposal.notes),
    internal_notes: toSafeString(proposal.internal_notes),
    exclusions: '',  // Proposal doesn't have exclusions
    warranty_terms: '',  // Proposal doesn't have warranty
    payment_terms: toSafeString(proposal.payment_terms),
    legal_terms: toSafeString(proposal.legal_terms),
  };
}

/**
 * Converts EstimateGroups output → Proposal update payload
 * 
 * CRITICAL: Filters to ONLY Proposal-compatible fields.
 * Validates and normalizes all numeric and string fields.
 * Prevents contamination of Proposal.items[] with EstimateGroups internals.
 */
export function extractProposalChanges(estimateData) {
  const items = mapGroupsToItems(estimateData.groups || []);
  
  // 🔒 Safety: Ensure NO extra fields polluted items[]
  if (items.some(item => 'unit_cost' in item)) {
    console.warn('⚠️ ProposalAdapter: unit_cost detected in items — filtering');
    items.forEach(item => delete item.unit_cost);
  }
  if (items.some(item => 'taxable' in item)) {
    console.warn('⚠️ ProposalAdapter: taxable detected in items — filtering');
    items.forEach(item => delete item.taxable);
  }
  
  return {
    items,
    subtotal: toSafeNumber(estimateData.subtotal, 0),
    tax_rate: toSafeNumber(estimateData.tax_rate, 0),
    tax_amount: toSafeNumber(estimateData.tax_amount, 0),
    discount_value: toSafeNumber(estimateData.discount_value, 0),
    total_amount: toSafeNumber(estimateData.total, 0),
    payment_terms: toSafeString(estimateData.payment_terms),
    legal_terms: toSafeString(estimateData.legal_terms),
    notes: toSafeString(estimateData.notes),
    internal_notes: toSafeString(estimateData.internal_notes),
    expiration_date: toSafeString(estimateData.expiration_date),
  };
}