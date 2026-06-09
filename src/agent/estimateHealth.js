/**
 * agent/estimateHealth.js
 * Read-only Estimate Health System.
 * Produces a health score, severity, checks, and next action.
 */

const VALID_STATUSES = ['draft', 'sent', 'viewed', 'approved', 'declined'];

function addCheck(checks, { id, label, status, severity = 'info', message = '' }) {
  checks.push({ id, label, status, severity, message });
}

function calcScore(checks) {
  let score = 100;
  for (const check of checks) {
    if (check.status === 'fail' && check.severity === 'critical') score -= 35;
    else if (check.status === 'fail') score -= 20;
    else if (check.status === 'warn') score -= 10;
  }
  return Math.max(0, score);
}

function deriveLevel(score) {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'warning';
  return 'critical';
}

function deriveNextAction(checks) {
  const firstFail = checks.find(c => c.status === 'fail');
  if (firstFail) return firstFail.message || firstFail.label;
  const firstWarn = checks.find(c => c.status === 'warn');
  if (firstWarn) return firstWarn.message || firstWarn.label;
  return 'Estimate is ready for the next workflow step';
}

export function analyzeEstimateHealth(estimate = {}) {
  const checks = [];
  const groupsCount = Array.isArray(estimate.groups) ? estimate.groups.length : 0;
  const lineItemsCount = Array.isArray(estimate.line_items) ? estimate.line_items.length : 0;
  const hasCustomer = !!(estimate.client_name || estimate.client_id);
  const hasEmail = !!estimate.client_email;
  const total = Number(estimate.total || 0);
  const documentType = estimate.document_type || '';
  const status = estimate.status || '';

  addCheck(checks, {
    id: 'customer_linked',
    label: 'Customer linked',
    status: hasCustomer ? 'pass' : 'fail',
    severity: 'critical',
    message: hasCustomer ? 'Customer is linked' : 'Add a customer before continuing estimate workflow',
  });

  addCheck(checks, {
    id: 'status_valid',
    label: 'Estimate status valid',
    status: VALID_STATUSES.includes(status) ? 'pass' : 'warn',
    severity: 'high',
    message: VALID_STATUSES.includes(status)
      ? `Status ${status} is valid`
      : `Estimate status "${status}" is outside the base schema enum`,
  });

  addCheck(checks, {
    id: 'document_type_valid',
    label: 'Document type aligned',
    status: documentType === 'ESTIMATE' || documentType === 'BID' ? 'pass' : 'warn',
    severity: 'medium',
    message: documentType === 'ESTIMATE' || documentType === 'BID'
      ? `Document type ${documentType} is aligned`
      : `Document type "${documentType}" should be ESTIMATE or BID in this flow`,
  });

  addCheck(checks, {
    id: 'has_scope',
    label: 'Estimate has scope items',
    status: groupsCount > 0 || lineItemsCount > 0 ? 'pass' : 'fail',
    severity: 'high',
    message: groupsCount > 0 || lineItemsCount > 0
      ? 'Estimate contains scope items'
      : 'Add at least one group or line item before sending',
  });

  addCheck(checks, {
    id: 'total_positive',
    label: 'Estimate total is positive',
    status: total > 0 ? 'pass' : 'warn',
    severity: 'medium',
    message: total > 0 ? 'Estimate total is valid' : 'Estimate total is zero or missing',
  });

  addCheck(checks, {
    id: 'client_email_ready',
    label: 'Client email ready for send',
    status: status === 'draft' && !hasEmail ? 'warn' : 'pass',
    severity: 'medium',
    message: status === 'draft' && !hasEmail
      ? 'Add client email before using Review & Send'
      : 'Client email check passed',
  });

  addCheck(checks, {
    id: 'legacy_dual_identity',
    label: 'No mixed customer identity',
    status: estimate.client_id && estimate.customer_id ? 'fail' : 'pass',
    severity: 'critical',
    message: estimate.client_id && estimate.customer_id
      ? 'Resolve mixed client_id and customer_id references'
      : 'Identity mapping looks clean',
  });

  const score = calcScore(checks);
  const level = deriveLevel(score);
  const nextAction = deriveNextAction(checks);

  return {
    score,
    level,
    nextAction,
    checks,
    summary: `${level.toUpperCase()} — score ${score}`,
  };
}

export default { analyzeEstimateHealth };
