/**
 * Adapter: Proposal items[] ↔ EstimateGroups format
 * 
 * HARDENED VERSION: Prevents field contamination, NaN, and unsafe conversions.
 * Uses normalizeLineItem for canonical shape compliance.
 * 
 * Proposal.items[] persists: id, service_name, description, quantity, unit,
 * book_price, unit_price, unit_cost, line_total
 * 
 * unit_cost IS now persisted on Proposal items to enable shared pricing logic
 * (margin calculations, loss prevention, negotiation helpers).
 * 
 * Fields NOT persisted to Proposal: taxable, _service_id, _from_picker, _is_new
 */

import { normalizeLineItem, sanitizeForPersistence } from '@/lib/lineItemNormalizer';

// ─── SAFE CONVERSION UTILITIES ────────────────────────────────────────────────

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
  return toSafeNumber(qty * price, 0);
};

// ─── PUBLIC ADAPTERS ──────────────────────────────────────────────────────────

/**
 * Converts proposal.items[] → groups[] (EstimateGroups format)
 * 
 * Adapts Proposal fields to what EstimateGroups expects.
 * unit_cost is carried through for pricing intelligence.
 */
export function mapItemsToGroups(items = []) {
  return [
    {
      id: 'default-group',
      name: 'Services',
      collapsed: false,
      items: (items || []).map(item => normalizeLineItem(item)),
    },
  ];
}

/**
 * Converts groups[] → items[] (Proposal format)
 * 
 * Persists: id, service_name, description, quantity, unit,
 *           book_price, unit_price, unit_cost, line_total
 * Strips: taxable, _service_id, _from_picker, _is_new, category, collapsed
 */
export function mapGroupsToItems(groups = []) {
  return (groups || []).flatMap(group =>
    (group.items || []).map(item => {
      // Normalize first to handle legacy aliases, then strip UI-only fields
      const normalized = normalizeLineItem(item);
      const clean = sanitizeForPersistence(normalized);
      return {
        id: clean.id,
        service_id: clean.service_id,
        service_name: clean.service_name,
        category: clean.category,
        description: clean.description,
        quantity: clean.quantity,
        unit: clean.unit,
        unit_price: clean.unit_price,
        unit_cost: clean.unit_cost,
        book_price: clean.book_price,
        line_total: clean.line_total,
        taxable: clean.taxable,
      };
    })
  );
}

/**
 * Creates a mock "estimate" object that EstimateGroups expects
 * from a Proposal, without modifying the original.
 */
export function createEstimateProxy(proposal) {
  return {
    id: proposal.id,
    estimate_number: proposal.proposal_number,
    title: toSafeString(proposal.title),
    groups: mapItemsToGroups(proposal.items),
    tax_rate: toSafeNumber(proposal.tax_rate, 0),
    discount_type: toSafeString(proposal.discount_type, 'fixed'),
    discount_value: toSafeNumber(proposal.discount_value, 0),
    deposit_percent: 0,
    expiration_date: toSafeString(proposal.expiration_date),
    notes: toSafeString(proposal.notes),
    internal_notes: toSafeString(proposal.internal_notes),
    exclusions: '',
    warranty_terms: '',
    payment_terms: toSafeString(proposal.payment_terms),
    legal_terms: toSafeString(proposal.legal_terms),
    // Pass through cost/margin for pricing intelligence
    total_cost: toSafeNumber(proposal.total_cost, 0),
    gross_margin: toSafeNumber(proposal.gross_margin, 0),
    gross_margin_pct: toSafeNumber(proposal.gross_margin_pct, 0),
  };
}

/**
 * Converts EstimateGroups output → Proposal update payload
 * 
 * Now includes unit_cost in items and cost/margin at document level
 * for shared pricing intelligence (loss prevention, margin guard).
 */
export function extractProposalChanges(estimateData) {
  const items = mapGroupsToItems(estimateData.groups || []);

  return {
    items,
    subtotal: toSafeNumber(estimateData.subtotal, 0),
    tax_rate: toSafeNumber(estimateData.tax_rate, 0),
    tax_amount: toSafeNumber(estimateData.tax_amount, 0),
    discount_value: toSafeNumber(estimateData.discount_value, 0),
    total_amount: toSafeNumber(estimateData.total, 0),
    total_cost: toSafeNumber(estimateData.total_cost, 0),
    gross_margin: toSafeNumber(estimateData.gross_margin, 0),
    gross_margin_pct: toSafeNumber(estimateData.gross_margin_pct, 0),
    payment_terms: toSafeString(estimateData.payment_terms),
    legal_terms: toSafeString(estimateData.legal_terms),
    notes: toSafeString(estimateData.notes),
    internal_notes: toSafeString(estimateData.internal_notes),
    expiration_date: toSafeString(estimateData.expiration_date),
  };
}