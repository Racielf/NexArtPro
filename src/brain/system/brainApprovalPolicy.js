export function evaluateBrainApproval({ modes, risk }) {
  const { canExecute } = modes;
  const { riskLevel } = risk;

  if (!canExecute) {
    return {
      allowed: false,
      requiresConfirmation: false,
      approvalLevel: 'blocked',
      executionMode: 'blocked',
      reason: 'Execution is disabled due to active modes (write/decision/observation/learning).',
    };
  }

  if (riskLevel === 'low') {
    return {
      allowed: true,
      requiresConfirmation: false,
      approvalLevel: 'none',
      executionMode: 'suggest_only',
      reason: 'Low-risk action. Suggestion only, no execution.',
    };
  }

  if (riskLevel === 'medium') {
    return {
      allowed: true,
      requiresConfirmation: true,
      approvalLevel: 'confirm',
      executionMode: 'confirm_then_execute',
      reason: 'Medium-risk action requires user confirmation before execution.',
    };
  }

  return {
    allowed: true,
    requiresConfirmation: true,
    approvalLevel: 'explicit',
    executionMode: 'confirm_then_execute',
    reason: 'High-risk action requires explicit confirmation (financial or destructive).',
  };
}
