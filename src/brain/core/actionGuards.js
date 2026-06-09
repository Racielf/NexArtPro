/**
 * brain/core/actionGuards.js
 */

export function runActionGuard(action, brainResult, context = {}) {
  const { modes, risk, approval } = context || {};

  // Existing blocking checks (preserved)
  if (brainResult && brainResult.checks) {
    const blocking = brainResult.checks.find(
      c => c.status === 'fail' && c.blockingActions?.includes(action)
    );

    if (blocking) {
      return {
        allowed: false,
        blocked: true,
        requiresConfirmation: false,
        reason: blocking.message || 'Action blocked by system health rules',
        blockingCheck: blocking.id,
      };
    }
  }

  // Phase 2 integration
  if (approval) {
    if (!approval.allowed) {
      return {
        allowed: false,
        blocked: true,
        requiresConfirmation: false,
        reason: approval.reason,
      };
    }

    if (approval.requiresConfirmation) {
      return {
        allowed: true,
        blocked: false,
        requiresConfirmation: true,
        reason: approval.reason,
      };
    }
  }

  return {
    allowed: true,
    blocked: false,
    requiresConfirmation: false,
    reason: '',
  };
}
