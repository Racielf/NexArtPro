export function evaluateBrainApproval({ modes, risk }) {
  if (!modes.canExecute) {
    return { allowed: false, executionMode: 'blocked', reason: 'Execution disabled by mode' };
  }

  if (risk === 'low') {
    return { allowed: true, executionMode: 'suggest_only' };
  }

  if (risk === 'medium') {
    return { allowed: true, executionMode: 'confirm_then_execute' };
  }

  return { allowed: true, executionMode: 'confirm_then_execute', approvalLevel: 'explicit' };
}
