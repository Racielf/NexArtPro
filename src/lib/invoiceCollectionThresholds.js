/**
 * invoiceCollectionThresholds.js
 * Simple hardcoded thresholds for capacity overload detection
 * Conservative defaults to flag early
 */

export const CAPACITY_THRESHOLDS = {
  // Urgent items threshold
  urgent_count_threshold: 3,
  // Action-today items threshold
  action_today_count_threshold: 5,
  // Total assigned balance threshold (in dollars)
  total_balance_threshold: 15000,
  // Billing issues threshold
  billing_issue_threshold: 2,
};

/**
 * Check if owner is overloaded
 */
export function isOwnerOverloaded(ownerMetrics) {
  const { urgent_count, action_today_count, billing_issue_count, total_balance } = ownerMetrics;
  const { urgent_count_threshold, action_today_count_threshold, total_balance_threshold, billing_issue_threshold } = CAPACITY_THRESHOLDS;

  return (
    urgent_count >= urgent_count_threshold ||
    action_today_count >= action_today_count_threshold ||
    total_balance >= total_balance_threshold ||
    billing_issue_count >= billing_issue_threshold
  );
}

/**
 * Get overload severity label + color
 */
export function getOverloadStatus(ownerMetrics) {
  const { urgent_count, action_today_count, billing_issue_count, total_balance } = ownerMetrics;
  const { urgent_count_threshold, action_today_count_threshold, total_balance_threshold, billing_issue_threshold } = CAPACITY_THRESHOLDS;

  // Critical: urgent threshold exceeded
  if (urgent_count >= urgent_count_threshold) {
    return { severity: 'critical', label: `${urgent_count} urgent`, color: 'text-red-700 bg-red-50 border-red-200' };
  }

  // High: high action-today or high total balance
  if (action_today_count >= action_today_count_threshold || total_balance >= total_balance_threshold) {
    return { severity: 'high', label: `High load`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
  }

  // Medium: multiple billing issues
  if (billing_issue_count >= billing_issue_threshold) {
    return { severity: 'medium', label: `${billing_issue_count} issues`, color: 'text-blue-700 bg-blue-50 border-blue-200' };
  }

  return null;
}