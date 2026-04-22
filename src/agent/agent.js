/**
 * agent/agent.js
 */

import { analyzeChange, analyzeEstimateContext } from './brain.js';
import { analyzeEstimateHealth } from './estimateHealth.js';
import AGENT_CONFIG from './config.js';

export async function runAgent(input = null) {
  const base = { input: { filePath: input?.filePath ?? '', diff: input?.diff ?? '' } };

  if (!AGENT_CONFIG.enabled) {
    return { ...base, passed: false, type: 'warn', message: 'Agent disabled', suggestion: '' };
  }

  const result = await analyzeChange({ filePath: input.filePath, diff: input.diff });

  return {
    passed: result.type === 'none',
    type: result.type,
    message: result.message,
    suggestion: result.suggestion,
    input,
  };
}

export async function runEstimateContextAudit(input = {}) {
  if (!AGENT_CONFIG.enabled) {
    return { type: 'warn', message: 'Agent disabled', suggestion: '' };
  }

  const result = analyzeEstimateContext(input);

  if (result.type === 'warn') {
    console.warn('[ESTIMATE AGENT WARNING]', result.message, result.suggestion);
  } else {
    console.log('[ESTIMATE AGENT OK]', input.filePath);
  }

  return result;
}

/** NEW — Estimate Health System */
export async function runEstimateHealthCheck(estimate) {
  if (!AGENT_CONFIG.enabled) {
    return { score: 0, level: 'disabled', nextAction: 'Agent disabled', checks: [] };
  }

  const result = analyzeEstimateHealth(estimate);

  console.log('[ESTIMATE HEALTH]', result);

  return result;
}

export default { runAgent, runEstimateContextAudit, runEstimateHealthCheck };

export const manualEstimateContextTest = {
  filePath: 'src/components/estimates/EstimateHeader.jsx',
  content: `
    <button>Back to Clients</button>
    base44.entities.Client.list();
    const rec = { client_id: '1', customer_id: '2' };
  `,
};