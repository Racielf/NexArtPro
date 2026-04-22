/**
 * brain/core/brainTypes.js
 * Shared contracts for the Central Brain layer.
 */

export const BrainLevel = Object.freeze({
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown',
});

export const CheckStatus = Object.freeze({
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  INFO: 'info',
});

export const CheckSeverity = Object.freeze({
  INFO: 'info',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export function createCheck({
  id,
  label,
  status = CheckStatus.INFO,
  severity = CheckSeverity.INFO,
  message = '',
  action = '',
  meta = {},
}) {
  return { id, label, status, severity, message, action, meta };
}

export function createBrainResult({
  module,
  page = '',
  score = 100,
  level = BrainLevel.HEALTHY,
  checks = [],
  risks = [],
  nextAction = '',
  allowedActions = {},
  suggestedActions = [],
  meta = {},
}) {
  return {
    module,
    page,
    score,
    level,
    checks,
    risks,
    nextAction,
    allowedActions,
    suggestedActions,
    meta,
  };
}

export function createBrainPayload({
  module,
  page = '',
  entity = null,
  related = {},
  context = {},
}) {
  return { module, page, entity, related, context };
}
