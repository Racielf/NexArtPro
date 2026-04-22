/**
 * agent/agent.js
 * Main entry point for the internal agent module.
 * Initializes the watcher and orchestrates analysis via brain.
 */

import { analyze } from './brain.js';
import AGENT_CONFIG from './config.js';

// Mock watcher — replace with real file/entity watcher when ready
function createWatcher() {
  return {
    start() {
      console.log('[agent:watcher] started (mock)');
    },
    stop() {
      console.log('[agent:watcher] stopped');
    },
    // Simulate an observed change event
    mockEvent(payload) {
      console.log('[agent:watcher] event received:', payload);
      return payload;
    },
  };
}

const watcher = createWatcher();

/**
 * runAgent(input?)
 * Starts the agent. Optionally accepts a manual input to analyze immediately.
 * @param {object} [input] - Optional input to analyze right away
 */
export function runAgent(input = null) {
  if (!AGENT_CONFIG.enabled) {
    console.warn('[agent] disabled via config. Skipping.');
    return;
  }

  console.log(`[agent] starting — ${AGENT_CONFIG.name} v${AGENT_CONFIG.version}`);
  watcher.start();

  if (input) {
    const result = analyze(input);
    console.log('[agent] analysis result:', result);
    return result;
  }
}

export default { runAgent, watcher };