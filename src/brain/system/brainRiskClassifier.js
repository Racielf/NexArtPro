const HIGH_RISK_ACTIONS = new Set([
  'price_book_update',
  'invoice_payment_change',
  'financial_write',
  'delete_record',
  'payroll_change',
  'profitability_change',
]);

const MEDIUM_RISK_ACTIONS = new Set([
  'status_change',
  'schedule_update',
  'follow_up',
  'operational_follow_up',
]);

export function classifyBrainActionRisk(actionType = '') {
  const normalized = String(actionType || '').trim().toLowerCase();

  if (HIGH_RISK_ACTIONS.has(normalized)) {
    return {
      riskLevel: 'high',
      reason: 'This action can affect financial, pricing, payroll, profitability, payment, invoice, or destructive data.',
      tags: ['high_risk', 'requires_explicit_confirmation'],
    };
  }

  if (MEDIUM_RISK_ACTIONS.has(normalized)) {
    return {
      riskLevel: 'medium',
      reason: 'This action can change operational state, scheduling, or follow-up workflow.',
      tags: ['medium_risk', 'requires_confirmation'],
    };
  }

  return {
    riskLevel: 'low',
    reason: 'This action is treated as an insight, recommendation, or non-mutating guidance.',
    tags: ['low_risk', 'suggest_only'],
  };
}
