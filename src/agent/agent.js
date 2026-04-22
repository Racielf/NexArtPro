/**
 * agent/agent.js
 * Main entry point for the internal agent module.
 * Accepts manual events via runAgent() and orchestrates analysis via brain.
 */

import { analyzeChange } from './brain.js';
import AGENT_CONFIG from './config.js';

/**
 * runAgent({ filePath, diff, type? })
 * Main entry point. Analyzes a change and reports the review result.
 * @param {{ filePath: string, diff: string, type?: string }} input
 */
export async function runAgent(input = null) {
  const base = { input: { filePath: input?.filePath ?? '', diff: input?.diff ?? '' } };

  if (!AGENT_CONFIG.enabled) {
    console.warn('[agent] disabled via config. Skipping.');
    return { ...base, passed: false, type: 'warn', message: 'Agent disabled', suggestion: '' };
  }

  // Validate input
  if (typeof input?.filePath !== 'string' || input.filePath.trim() === '') {
    console.warn('[agent] Invalid input: filePath missing or empty');
    return { ...base, passed: false, type: 'warn', message: 'Invalid agent input', suggestion: '' };
  }
  if (typeof input?.diff !== 'string') {
    console.warn('[agent] Invalid input: diff must be a string');
    return { ...base, passed: false, type: 'warn', message: 'Invalid agent input', suggestion: '' };
  }

  console.log(`[AGENT] analyzing: ${input.filePath}`);

  const result = await analyzeChange({ filePath: input.filePath, diff: input.diff });

  const passed = result.type === 'none';

  if (result.type === 'warn') {
    console.warn('[AGENT WARNING]', result.message);
    if (result.suggestion) console.warn('[AGENT WARNING] suggestion:', result.suggestion);
  } else if (result.type === 'patch') {
    console.info('[AGENT PATCH SUGGESTION]', result.message);
    if (result.suggestion) console.info('[AGENT PATCH SUGGESTION] fix:', result.suggestion);
  } else {
    console.log('[AGENT OK]', input.filePath);
  }

  return {
    passed,
    type: result.type ?? 'none',
    message: result.message ?? '',
    suggestion: result.suggestion ?? '',
    input: { filePath: input.filePath, diff: input.diff },
  };
}

export default { runAgent };