/**
 * brain/core/brainAggregator.js
 */

import { BrainLevel, DecisionPriority } from './brainTypes';

export function deriveScore(checks = []) {
  let score = 100;

  for (const c of checks) {
    if (c.status === 'fail') {
      if (c.severity === 'critical') score -= 40;
      else if (c.severity === 'high') score -= 30;
      else score -= 20;
    } else if (c.status === 'warn') {
      score -= 10;
    }
  }

  return Math.max(0, score);
}

export function deriveLevel(score) {
  if (score >= 90) return BrainLevel.HEALTHY;
  if (score >= 70) return BrainLevel.WARNING;
  return BrainLevel.CRITICAL;
}

export function buildReadinessMap(checks = []) {
  const readiness = {};

  for (const c of checks) {
    if (!c.blockingActions) continue;

    for (const action of c.blockingActions) {
      readiness[action] = {
        allowed: c.status !== 'fail',
        reason: c.status === 'fail' ? c.message : '',
      };
    }
  }

  return readiness;
}

export function aggregateBrainResults(results = [], meta = {}) {
  const checks = results.flatMap(r => r?.checks || []);

  const score = deriveScore(checks);
  const level = deriveLevel(score);

  const blockers = checks.filter(c => c.status === 'fail' && (c.blockingActions?.length || c.type === 'guard'));
  const warnings = checks.filter(c => c.status === 'warn');
  const risks = checks.filter(c => c.status !== 'pass');

  const nextAction =
    blockers[0]?.message ||
    warnings[0]?.message ||
    'System operating normally';

  const priority = blockers.length
    ? DecisionPriority.CRITICAL
    : warnings.length
      ? DecisionPriority.HIGH
      : DecisionPriority.LOW;

  const suggestedActions = risks.map(r => r.action).filter(Boolean);

  const readiness = buildReadinessMap(checks);

  return {
    ...meta,
    score,
    level,
    checks,
    risks,
    blockers: blockers.map(b => b.id),
    warnings: warnings.map(w => w.id),
    readiness,
    decision: {
      priority,
      nextAction,
      summary: nextAction,
      blockers: blockers.map(b => b.id),
      warnings: warnings.map(w => w.id),
      suggestedActions,
    },
  };
}
