/**
 * brain/core/executeAgentAction.js
 * Phase 3.5 — Controlled Execution Layer
 *
 * SIMULATION ONLY — no real mutations are performed.
 * All execution plans describe what WOULD happen, not what IS happening.
 */

import { classifyBrainActionRisk } from '@/brain/system/brainRiskClassifier';
import { evaluateBrainApproval } from '@/brain/system/brainApprovalPolicy';
import { runActionGuard } from '@/brain/core/actionGuards';
import { defaultBrainConfig } from '@/brain/system/systemBrainConfig';
import { resolveBrainModes } from '@/brain/system/brainModeService';

// Maps actionType → human-readable simulation description
const EXECUTION_PLAN_MAP = {
  follow_up:            'Would send a follow-up notification for the selected estimate(s).',
  status_change:        'Would update the work order status to the next operational stage.',
  operational_follow_up:'Would flag unassigned work order(s) for manual assignment review.',
  navigate_review:      'Would navigate to the relevant section for manual review.',
  suggest_only:         'No execution — suggestion only. Navigate to review manually.',
};

function buildExecutionPlan(actionType, payload = {}) {
  const base = EXECUTION_PLAN_MAP[actionType] || 'Would perform a controlled read-only analysis.';
  const details = [];

  if (payload.count)  details.push(`Affected records: ${payload.count}`);
  if (payload.amount) details.push(`Amount involved: $${Number(payload.amount).toLocaleString()}`);
  if (payload.target) details.push(`Target section: ${payload.target}`);

  return {
    description: base,
    details,
    simulationOnly: true,
    note: 'Phase 3.5 — SIMULATION ONLY. No data was modified.',
  };
}

/**
 * executeAgentAction(action)
 *
 * Runs the full guard/approval/risk pipeline and returns a decision object.
 * Does NOT perform any actual database or API mutation.
 *
 * @param {Object} action - A suggested action from buildSuggestedActions()
 * @param {Object} [config] - Optional brain config override
 * @returns {{ allowed, requiresConfirmation, blocked, reason, riskLevel, executionMode, executionPlan }}
 */
export function executeAgentAction(action, config = defaultBrainConfig) {
  const effectiveConfig = { ...defaultBrainConfig, ...config };
  const modes = resolveBrainModes(effectiveConfig);

  const actionType = action?.actionType || 'suggest_only';
  const payload    = action?.payload    || {};

  // Step 1 — Risk classification
  const risk = classifyBrainActionRisk(actionType);

  // Step 2 — Approval policy
  const approval = evaluateBrainApproval({ modes, risk, config: effectiveConfig });

  // Step 3 — Action guard
  const guard = runActionGuard(actionType, null, { modes, risk, approval });

  // Step 4 — Build execution plan (simulation)
  const executionPlan = buildExecutionPlan(actionType, payload);

  if (guard.blocked || !guard.allowed) {
    return {
      allowed: false,
      requiresConfirmation: false,
      blocked: true,
      reason: guard.reason || approval.reason || 'Action blocked by system policy.',
      riskLevel: risk.riskLevel,
      executionMode: 'blocked',
      executionPlan,
    };
  }

  if (guard.requiresConfirmation || approval.requiresConfirmation) {
    return {
      allowed: true,
      requiresConfirmation: true,
      blocked: false,
      reason: approval.reason || guard.reason || 'Confirmation required before execution.',
      riskLevel: risk.riskLevel,
      executionMode: approval.executionMode || 'confirm_then_execute',
      executionPlan,
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    blocked: false,
    reason: approval.reason || 'Action cleared for execution.',
    riskLevel: risk.riskLevel,
    executionMode: approval.executionMode || 'suggest_only',
    executionPlan,
  };
}