/**
 * brain/core/actionGuards.js
 */

export function runActionGuard(action, brainResult) {
  if (!brainResult || !brainResult.checks) {
    return { allowed: true, reason: '' };
  }

  const blocking = brainResult.checks.find(
    c => c.status === 'fail' && c.blockingActions?.includes(action)
  );

  if (blocking) {
    return {
      allowed: false,
      reason: blocking.message || 'Action blocked by system health rules',
      blockingCheck: blocking.id,
    };
  }

  return { allowed: true, reason: '' };
}
