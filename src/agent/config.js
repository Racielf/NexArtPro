/**
 * agent/config.js
 * Engineering rules + business domain rules for the RC Art CRM agent.
 */

// ── ENGINEERING RULES ────────────────────────────────────────────────────────

export const ENGINEERING_RULES = {
  no_break_backend: {
    id: 'no_break_backend',
    description: 'Never modify backend functions in a way that breaks existing API contracts.',
    severity: 'critical',
  },
  surgical_changes: {
    id: 'surgical_changes',
    description: 'Apply the minimum change needed. Avoid sweeping refactors unless explicitly requested.',
    severity: 'high',
  },
  avoid_duplication: {
    id: 'avoid_duplication',
    description: 'Before creating new logic, check if it already exists in the codebase.',
    severity: 'medium',
  },
};

// ── DIFF / FILE PATTERN RULES ────────────────────────────────────────────────
// These rules receive { filePath, diff } and return { type, message, suggestion }

export const DIFF_RULES = [
  {
    id: 'client_ref_in_estimate_module',
    description: 'Estimate modules should reference Customer, not Client entity.',
    severity: 'high',
    suggestion: "Replace base44.entities.Client with base44.entities.Customer and update any client_id references to customer_id. Use the dual-lookup pattern in EstimateSidebarCustomer only where backward compat is explicitly needed.",
    validate({ filePath, diff }) {
      const inEstimate = /estimate/i.test(filePath);
      if (!inEstimate) return { valid: true };
      // Allow EstimateSidebarCustomer which has a documented dual-lookup
      if (/EstimateSidebarCustomer/i.test(filePath)) return { valid: true };
      const hasClientRef = /\bClient\.(list|filter|create|update|delete|get)\b/.test(diff);
      if (!hasClientRef) return { valid: true };
      return {
        valid: false,
        type: 'warn',
        message: `Estimate module "${filePath}" is calling base44.entities.Client directly.`,
      };
    },
  },
  {
    id: 'mixed_client_customer_ids',
    description: 'A single file should not set both client_id and customer_id on the same record.',
    severity: 'high',
    suggestion: "Remove customer_id from the record and resolve all lookups from Customer entity using customer_id as the canonical key. Keep client_id only in legacy estimate snapshot fields — never assign both on the same write.",
    validate({ filePath, diff }) {
      const hasClientId   = /client_id\s*[:=]/.test(diff);
      const hasCustomerId = /customer_id\s*[:=]/.test(diff);
      if (!(hasClientId && hasCustomerId)) return { valid: true };
      return {
        valid: false,
        type: 'warn',
        message: `"${filePath}" assigns both client_id and customer_id on the same object.`,
      };
    },
  },
  {
    id: 'stale_client_ui_strings',
    description: 'New modules should not contain legacy "Client"-branded UI strings.',
    severity: 'medium',
    suggestion: 'Replace the detected label(s) with their canonical equivalents: "Client Profile" → "Customer Profile", "Back to Clients" → "Back to Customers", "View Client" → "View Customer". This aligns the UI with the unified Customer entity.',
    // Exempted paths that intentionally keep "Client" terminology
    EXEMPT: [/Clients\.jsx?$/, /ClientPortal/, /ClientEstimateView/, /ClientFormModal/, /ClientDocuments/, /ClientCRM/],
    validate({ filePath, diff }) {
      if (this.EXEMPT.some(re => re.test(filePath))) return { valid: true };
      const staleStrings = [
        '"Client Profile"',
        "'Client Profile'",
        '"Back to Clients"',
        "'Back to Clients'",
        '"View Client"',
        "'View Client'",
      ];
      const found = staleStrings.filter(s => diff.includes(s));
      if (found.length === 0) return { valid: true };
      return {
        valid: false,
        type: 'warn',
        message: `"${filePath}" contains legacy Client UI label(s): ${found.join(', ')}.`,
      };
    },
  },
];

// ── BUSINESS DOMAIN RULES ────────────────────────────────────────────────────

export const BUSINESS_RULES = {

  // Estimate lifecycle
  no_invoice_without_approval: {
    id: 'no_invoice_without_approval',
    description: 'ConvertToInvoice must only be allowed when estimate.status === "approved".',
    severity: 'critical',
    /**
     * @param {{ status: string }} estimate
     * @returns {{ valid: boolean, reason?: string }}
     */
    validate(estimate) {
      const valid = estimate?.status === 'approved';
      return { valid, reason: valid ? null : `Cannot convert to invoice: status is "${estimate?.status}", must be "approved".` };
    },
  },

  valid_estimate_status: {
    id: 'valid_estimate_status',
    description: 'Estimate status must be one of the allowed enum values.',
    severity: 'high',
    ALLOWED: ['draft', 'sent', 'viewed', 'approved', 'declined'],
    /**
     * @param {{ status: string }} estimate
     */
    validate(estimate) {
      const valid = this.ALLOWED.includes(estimate?.status);
      return {
        valid,
        reason: valid ? null : `Invalid estimate status: "${estimate?.status}". Allowed: ${this.ALLOWED.join(', ')}.`,
      };
    },
  },

  // Customer / Client consistency
  no_mixed_client_customer: {
    id: 'no_mixed_client_customer',
    description: 'An estimate should not reference both client_id (Client entity) and customer_id (Customer entity) simultaneously.',
    severity: 'high',
    /**
     * @param {{ client_id?: string, customer_id?: string }} record
     */
    validate(record) {
      const hasBoth = !!(record?.client_id && record?.customer_id);
      return {
        valid: !hasBoth,
        reason: hasBoth ? 'Record has both client_id and customer_id set — resolve to one source of truth.' : null,
      };
    },
  },

  no_duplicate_client_data: {
    id: 'no_duplicate_client_data',
    description: 'Snapshot fields (client_name, client_email) should not diverge from the linked Client/Customer record.',
    severity: 'medium',
    /**
     * @param {{ client_name?: string, client_email?: string }} snapshot
     * @param {{ full_name?: string, email?: string }} linked
     */
    validate(snapshot, linked) {
      if (!linked) return { valid: true };
      const nameMismatch = snapshot?.client_name && linked?.full_name && snapshot.client_name !== linked.full_name;
      const emailMismatch = snapshot?.client_email && linked?.email && snapshot.client_email !== linked.email;
      const valid = !nameMismatch && !emailMismatch;
      const reason = !valid
        ? `Snapshot data diverges from linked record. Name: "${snapshot?.client_name}" vs "${linked?.full_name}". Email: "${snapshot?.client_email}" vs "${linked?.email}".`
        : null;
      return { valid, reason };
    },
  },

  // Pricing guards
  price_out_of_range: {
    id: 'price_out_of_range',
    description: 'Line item unit_price should be within an acceptable range (placeholder thresholds).',
    severity: 'medium',
    MIN: 0,
    MAX: 999999, // placeholder — replace with real catalog bounds
    /**
     * @param {{ unit_price: number, service_name?: string }} item
     */
    validate(item) {
      const price = item?.unit_price ?? 0;
      const valid = price >= this.MIN && price <= this.MAX;
      return {
        valid,
        reason: valid ? null : `Price $${price} for "${item?.service_name || 'item'}" is outside acceptable range ($${this.MIN}–$${this.MAX}).`,
      };
    },
  },
};

// ── COMBINED CONFIG ───────────────────────────────────────────────────────────

// Safe array exports — filter out any rule missing validate() to prevent runtime crashes
export const SAFE_BUSINESS_RULES = Object.values(BUSINESS_RULES).filter(
  r => r && typeof r.validate === 'function'
);

export const SAFE_ENGINEERING_RULES = Object.values(ENGINEERING_RULES).filter(
  r => r && typeof r.id === 'string'
);

export const AGENT_CONFIG = {
  name: 'rc-art-agent',
  version: '0.2.0',
  enabled: true,
  engineeringRules: SAFE_ENGINEERING_RULES,
  businessRules: SAFE_BUSINESS_RULES,
};

export default AGENT_CONFIG;