/**
 * pricingPermissions.js — Role-based permission layer for pricing-sensitive actions
 *
 * Sits ON TOP of pricingValidation.js. Does NOT duplicate loss detection logic.
 * Uses the output of validateEstimatePricing() and applies role-based rules.
 *
 * RBAC applies ONLY to loss pricing (unit_price < unit_cost).
 * Zero-profit (unit_price == unit_cost) is a standard confirmation for all roles.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS MATRIX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Action                        │ sales       │ manager       │ admin
 * ─────────────────────────────-┼─────────────┼───────────────┼──────────────
 * Send with loss pricing        │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 * Send with zero profit         │ CONFIRM     │ CONFIRM       │ CONFIRM
 * Approve with loss pricing     │ BLOCKED     │ OVERRIDE+PIN  │ OVERRIDE+PIN
 * Approve with zero profit      │ CONFIRM     │ CONFIRM       │ CONFIRM
 * Edit price below book         │ ALLOWED     │ ALLOWED       │ ALLOWED
 *
 * BLOCKED      = action disabled, message shown
 * CONFIRM      = standard confirmation dialog (no PIN, no reason, all roles)
 * OVERRIDE+PIN = explicit acknowledgement + manager/admin PIN + reason captured
 * ALLOWED      = no restriction
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
 * RBAC only gates LOSS pricing. Zero-profit is a standard confirmation for ALL roles.
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

  // Loss items present → role-gated
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

  // Zero profit only (no loss) → standard confirmation for ALL roles
  if (hasZeroProfit) {
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
 * Get a human-readable description of the user's pricing permissions.
 * Useful for UI tooltips.
 */
export function getPermissionSummary(role) {
  if (role === ROLES.ADMIN) {
    return 'Full access — can override loss pricing with PIN verification.';
  }
  if (role === ROLES.MANAGER) {
    return 'Can override loss pricing with PIN verification.';
  }
  return 'Standard access — cannot send or approve documents with loss pricing. Zero-profit requires confirmation.';
}