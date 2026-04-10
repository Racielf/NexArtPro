/**
 * pricingPermissions.js — Role-based permission layer for pricing-sensitive actions
 *
 * Sits ON TOP of pricingValidation.js. Does NOT duplicate loss detection logic.
 * Uses the output of validateEstimatePricing() and applies role-based rules.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS MATRIX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Action                        │ sales       │ manager       │ admin
 * ─────────────────────────────-┼─────────────┼───────────────┼──────────────
 * Send with loss pricing        │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 * Send with zero profit         │ BLOCKED     │ CONFIRM       │ CONFIRM
 * Approve with loss pricing     │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 * Approve with zero profit      │ BLOCKED     │ CONFIRM       │ CONFIRM
 * Override loss prevention      │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 * Edit price below book         │ ALLOWED*    │ ALLOWED       │ ALLOWED
 * Change document type          │ ALLOWED     │ ALLOWED       │ ALLOWED
 * View internal pricing fields  │ ALLOWED     │ ALLOWED       │ ALLOWED
 * Low margin send (<25%)        │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 *
 * * sales CAN set price below book but cannot send/approve if result is loss
 *
 * BLOCKED      = action disabled, message shown
 * CONFIRM      = confirmation dialog required
 * OVERRIDE+PIN = explicit acknowledgement + admin/manager PIN + reason captured
 * ALLOWED      = no restriction
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUDIT SHAPE (for future logging)
 * ═══════════════════════════════════════════════════════════════════════════════
 * {
 *   user_email: string,
 *   user_role: 'sales' | 'manager' | 'admin',
 *   action: string,      // e.g. 'override_loss_prevention', 'approve_zero_profit'
 *   reason: string,       // user-provided justification
 *   timestamp: ISO string,
 *   document_id: string,
 *   document_type: 'estimate' | 'proposal',
 *   document_number: number,
 *   pricing_snapshot: {   // captured at time of override
 *     lossItems: [],
 *     zeroProfitItems: [],
 *     grossMarginPct: number,
 *     total: number,
 *   }
 * }
 */

// ─── ROLE CONSTANTS ───────────────────────────────────────────────────────────

export const ROLES = {
  SALES: 'sales',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

const ROLE_HIERARCHY = { sales: 0, manager: 1, admin: 2 };

/**
 * Check if a role meets a minimum required level
 */
function hasMinRole(userRole, minRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
}

// ─── PERMISSION DEFINITIONS ───────────────────────────────────────────────────

/**
 * Gate result shape:
 * {
 *   allowed: boolean,          // can the action proceed at all?
 *   requiresOverride: boolean, // needs explicit override flow (PIN + reason)?
 *   requiresConfirm: boolean,  // needs simple confirmation?
 *   blockedReason: string|null // human-readable block message
 * }
 */

const RESULT_ALLOWED  = { allowed: true,  requiresOverride: false, requiresConfirm: false, blockedReason: null };
const RESULT_CONFIRM  = { allowed: true,  requiresOverride: false, requiresConfirm: true,  blockedReason: null };

function blocked(reason) {
  return { allowed: false, requiresOverride: false, requiresConfirm: false, blockedReason: reason };
}

function override() {
  return { allowed: true, requiresOverride: true, requiresConfirm: false, blockedReason: null };
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Check if user can send a document given its pricing validation result.
 *
 * @param {string} role - 'sales' | 'manager' | 'admin'
 * @param {{ canProceed, lossItems, zeroProfitItems, requiresConfirmation }} pricingResult
 *   Output of validateEstimatePricing()
 * @returns gate result
 */
export function canSendDocument(role, pricingResult) {
  if (!pricingResult) return RESULT_ALLOWED;

  const { lossItems = [], zeroProfitItems = [] } = pricingResult;
  const hasLoss = lossItems.length > 0;
  const hasZeroProfit = zeroProfitItems.length > 0;

  // No pricing issues → everyone can send
  if (!hasLoss && !hasZeroProfit) return RESULT_ALLOWED;

  // Loss items present
  if (hasLoss) {
    if (role === ROLES.SALES) {
      return blocked(
        `Cannot send — ${lossItems.length} item${lossItems.length > 1 ? 's' : ''} priced below cost. ` +
        'A manager or admin must override this before sending.'
      );
    }
    // manager/admin can override with PIN + reason
    return override();
  }

  // Zero profit only (no loss)
  if (hasZeroProfit) {
    if (role === ROLES.SALES) {
      return blocked(
        `Cannot send — ${zeroProfitItems.length} item${zeroProfitItems.length > 1 ? 's' : ''} at zero profit. ` +
        'A manager or admin must review before sending.'
      );
    }
    // manager/admin: simple confirm
    return RESULT_CONFIRM;
  }

  return RESULT_ALLOWED;
}

/**
 * Check if user can approve a document given its pricing validation result.
 * Same logic as send — same risk profile.
 */
export function canApproveDocument(role, pricingResult) {
  return canSendDocument(role, pricingResult);
}

/**
 * Check if user can proceed through a low-margin guard.
 *
 * @param {string} role
 * @param {number} marginPct
 * @param {number} [minMargin=25]
 * @returns gate result
 */
export function canProceedLowMargin(role, marginPct, minMargin = 25) {
  if (isNaN(marginPct) || marginPct >= minMargin) return RESULT_ALLOWED;

  if (role === ROLES.SALES) {
    return blocked(
      `Cannot proceed — margin is ${marginPct.toFixed(1)}% (minimum ${minMargin}%). ` +
      'A manager or admin must approve this.'
    );
  }

  // manager/admin: override with PIN
  return override();
}

/**
 * Build an audit record for a pricing override.
 * Call this when a manager/admin successfully overrides.
 *
 * @param {Object} params
 * @returns audit object ready for persistence
 */
export function buildPricingAuditRecord({
  userEmail,
  userRole,
  action,
  reason,
  documentId,
  documentType,
  documentNumber,
  pricingResult,
  grossMarginPct,
  total,
}) {
  return {
    user_email: userEmail,
    user_role: userRole,
    action,
    reason: reason || '',
    timestamp: new Date().toISOString(),
    document_id: documentId,
    document_type: documentType,
    document_number: documentNumber,
    pricing_snapshot: {
      lossItems: pricingResult?.lossItems || [],
      zeroProfitItems: pricingResult?.zeroProfitItems || [],
      grossMarginPct: grossMarginPct ?? null,
      total: total ?? null,
    },
  };
}

/**
 * Get a human-readable description of the user's pricing permissions.
 * Useful for UI tooltips.
 */
export function getPermissionSummary(role) {
  if (role === ROLES.ADMIN) {
    return 'Full access — can override all pricing restrictions with PIN verification.';
  }
  if (role === ROLES.MANAGER) {
    return 'Can override pricing restrictions with PIN verification. Cannot bypass system-level blocks.';
  }
  return 'Standard access — cannot send or approve documents with loss pricing or zero profit.';
}