/**
 * estimateLockGuard.js
 *
 * Hotfix: estimate-editor-send-lock-guards (v2)
 *
 * Pure helpers that determine whether an estimate is in a legally-sealed
 * state and should not be editable.
 *
 * Lock signals checked (in priority order):
 *   1. estimate.locked_after_signature === true  — explicit lock flag post-signing
 *   2. estimate.legal_package_locked === true     — legal package was finalized
 *   3. estimate.signature_status === 'completed'  — signing workflow fully completed
 *   4. estimate.final_signed_at                   — final signature timestamp present
 *   5. estimate.signed_at                         — client signing timestamp present
 *   6. estimate.status === 'signed'               — status-based lock
 *   7. estimate.status === 'converted'            — converted to WO/Invoice
 *   8. estimate.status === 'approved'             — client formally approved
 *   9. estimate.company_signed_at (when combined
 *      with a legal-closure signal)               — optional: company countersigned
 *
 * These helpers are intentionally dependency-free so they can be imported
 * anywhere without circular risk.
 */

// ── Lock signal evaluation ────────────────────────────────────────────────────

/**
 * Determines the primary lock reason key for an estimate.
 * Returns a string key or null if unlocked.
 *
 * @param {Object|null} estimate
 * @returns {'signed_at'|'final_signed_at'|'locked_after_signature'|
 *           'legal_package_locked'|'signature_completed'|
 *           'status_signed'|'status_converted'|'status_approved'|null}
 */
function getLockKey(estimate) {
  if (!estimate) return null;

  // Highest priority: explicit boolean lock flags
  if (estimate.locked_after_signature === true) return 'locked_after_signature';
  if (estimate.legal_package_locked === true) return 'legal_package_locked';

  // Signing workflow completion signal
  if (estimate.signature_status === 'completed') return 'signature_completed';

  // Timestamp-based signals (legally binding once written)
  if (estimate.final_signed_at) return 'final_signed_at';
  if (estimate.signed_at) return 'signed_at';

  // Status-based signals
  if (estimate.status === 'signed') return 'status_signed';
  if (estimate.status === 'converted') return 'status_converted';
  if (estimate.status === 'approved') return 'status_approved';

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the estimate is in any legally-locked state.
 * @param {Object|null} estimate
 * @returns {boolean}
 */
export function isEstimateLocked(estimate) {
  return getLockKey(estimate) !== null;
}

/**
 * Returns a user-facing reason string explaining why editing is locked,
 * or null if the estimate is editable.
 * @param {Object|null} estimate
 * @returns {string|null}
 */
export function getEstimateLockReason(estimate) {
  const key = getLockKey(estimate);
  if (!key) return null;

  switch (key) {
    case 'locked_after_signature':
      return 'This estimate was explicitly locked after signature. Editing is not allowed.';

    case 'legal_package_locked':
      return 'The legal package for this estimate has been finalized and locked. Editing is not allowed.';

    case 'signature_completed':
      return 'The signing process for this estimate is complete. Editing is not allowed.';

    case 'final_signed_at':
      return 'This estimate has a final signature on record and is legally sealed. Editing is not allowed.';

    case 'signed_at':
      return 'This estimate has been signed and is legally sealed. Editing is not allowed.';

    case 'status_signed':
      return 'This estimate has been signed and is legally sealed. Editing is not allowed.';

    case 'status_converted':
      return 'This estimate has been converted to a Work Order or Invoice and cannot be edited.';

    case 'status_approved':
      return 'This estimate has been approved by the client. Editing is not allowed.';

    default:
      return 'This estimate is locked and cannot be edited.';
  }
}
