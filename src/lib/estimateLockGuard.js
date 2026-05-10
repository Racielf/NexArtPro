/**
 * estimateLockGuard.js
 *
 * Hotfix: estimate-editor-send-lock-guards
 *
 * Pure helpers that determine whether an estimate is in a legally-sealed
 * state and should not be editable.
 *
 * Locked statuses:
 *   - signed    : client has signed — legal document
 *   - converted : already turned into a Work Order / Invoice — immutable source
 *   - approved  : client formally approved — edit would invalidate approval
 *
 * These helpers are intentionally dependency-free so they can be imported
 * anywhere without circular risk.
 */

/** Statuses that prevent editing */
export const LOCKED_STATUSES = ['signed', 'converted', 'approved'];

/**
 * Returns true if the estimate is in a legally-locked state.
 * @param {Object|null} estimate
 * @returns {boolean}
 */
export function isEstimateLocked(estimate) {
  if (!estimate) return false;
  return LOCKED_STATUSES.includes(estimate.status);
}

/**
 * Returns a user-facing reason string explaining why editing is locked,
 * or null if the estimate is editable.
 * @param {Object|null} estimate
 * @returns {string|null}
 */
export function getEstimateLockReason(estimate) {
  if (!estimate) return null;
  switch (estimate.status) {
    case 'signed':
      return 'This estimate has been signed and is legally sealed. Editing is not allowed.';
    case 'converted':
      return 'This estimate has been converted to a Work Order or Invoice and cannot be edited.';
    case 'approved':
      return 'This estimate has been approved by the client. Editing is not allowed.';
    default:
      return null;
  }
}
