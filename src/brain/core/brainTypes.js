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

export const CheckType = Object.freeze({
  HEALTH: 'health',
  INTEGRITY: 'integrity',
  READINESS: 'readiness',
  DEPENDENCY: 'dependency',
  GUARD: 'guard',
  INTELLIGENCE: 'intelligence',
});

export const DecisionPriority = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export function createCheck({
  id,
  label,
  type = CheckType.HEALTH,
  status = CheckStatus.INFO,
  severity = CheckSeverity.INFO,
  message = '',
  action = '',
  source = '',
  blockingActions = [],
  meta = {},
}) {
  return {
    id,
    label,
    type,
    status,
    severity,
    message,
    action,
    source,
    blockingActions,
    meta,
  };
}

export function createReadinessEntry(allowed = true, reason = '') {
  return { allowed, reason };
}

export function createDependencyEntry({ ready = true, reason = '', checks = {}, meta = {} } = {}) {
  return { ready, reason, checks, meta };
}

export function createDecision({
  priority = DecisionPriority.LOW,
  nextAction = '',
  summary = '',
  blockers = [],
  warnings = [],
  suggestedActions = [],
} = {}) {
  return {
    priority,
    nextAction,
    summary,
    blockers,
    warnings,
    suggestedActions,
  };
}

export function createBrainResult({
  module,
  page = '',
  entityId = '',
  score = 100,
  level = BrainLevel.HEALTHY,
  checks = [],
  decision = createDecision(),
  readiness = {},
  dependencies = {},
  risks = [],
  blockers = [],
  warnings = [],
  meta = {},
}) {
  return {
    module,
    page,
    entityId,
    score,
    level,
    checks,
    decision,
    readiness,
    dependencies,
    risks,
    blockers,
    warnings,
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
