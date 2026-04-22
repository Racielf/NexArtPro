/**
 * agent/agent.js
 * Main entry point for the internal agent module.
 * Initializes the watcher and orchestrates analysis via brain.
 */

import { analyzeChange } from './brain.js';
import AGENT_CONFIG from './config.js';

// Mock watcher — replace with real file watcher when running server-side
function createWatcher() {
  return {
    start() {
      console.log('[agent:watcher] started (mock)');
    },
    stop() {
      console.log('[agent:watcher] stopped');
    },
    mockEvent(payload) {
      console.log('[agent:watcher] event received:', payload);
      return payload;
    },
  };
}

const watcher = createWatcher();

/**
 * reportResult({ filePath, result })
 * Logs the agent's review decision to the console in a readable format.
 * Does NOT write files or modify code.
 */
function reportResult({ filePath, result }) {
  const { type, message, suggestion } = result;

  if (type === 'none') {
    console.log(`[agent] ✅ No issues found in: ${filePath}`);
    return;
  }

  if (type === 'warn') {
    console.warn(`[agent] ⚠️  WARNING in: ${filePath}`);
    console.warn(`         → ${message}`);
    if (suggestion) console.warn(`         💡 Suggestion: ${suggestion}`);
    return;
  }

  if (type === 'patch') {
    console.info(`[agent] 🔧 PATCH SUGGESTED for: ${filePath}`);
    console.info(`         → ${message}`);
    console.info(`         💡 Suggestion: ${suggestion}`);
  }
}

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
    if (result.suggestion) console.warn('[AGENT WARNING] detail:', result.suggestion);
  } else if (result.type === 'patch') {
    console.log('[AGENT SUGGESTION]', result.suggestion);
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

export default { runAgent, watcher };