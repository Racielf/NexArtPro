/**
 * brain/core/brainAggregator.js
 */

import { BrainLevel } from './brainTypes';

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

export function aggregateBrainResults(results = [], meta = {}) {
  const checks = results.flatMap(r => r?.checks || []);

  const score = deriveScore(checks);
  const level = deriveLevel(score);

  const risks = checks.filter(c => c.status !== 'pass');

  const nextAction =
    risks.find(r => r.status === 'fail')?.message ||
    risks.find(r => r.status === 'warn')?.message ||
    'System operating normally';

  const suggestedActions = risks
    .map(r => r.action)
    .filter(Boolean);

  return {
    ...meta,
    score,
    level,
    checks,
    risks,
    nextAction,
    suggestedActions,
  };
}
