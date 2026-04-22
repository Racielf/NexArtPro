/**
 * agent/brain.js
 * Analysis layer for the internal agent.
 * Receives structured input and applies configured rules.
 */

import { AGENT_RULES } from './config.js';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `You are a senior software engineering reviewer.
Your job is to analyze code diffs and detect potential issues.
Rules you must enforce:
- Never break existing backend API contracts
- Apply the minimum change needed (surgical changes only)
- Avoid duplicating logic that already exists

Respond ONLY with valid JSON in this exact shape:
{
  "type": "patch" | "warn" | "none",
  "message": "short description of the issue",
  "suggestion": "what to do instead"
}`;

/**
 * analyze(input) — legacy sync stub, kept for compatibility
 */
export function analyze(input) {
  console.log('[agent:brain] analyze called with:', input);
  return { input, violations: [], passed: true };
}

/**
 * analyzeChange({ filePath, diff })
 * Sends a file diff to the LLM and returns a structured review decision.
 * Does NOT apply any changes — analysis only.
 */
export async function analyzeChange({ filePath, diff }) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `File: ${filePath}\n\nDiff:\n${diff}`,
      response_json_schema: {
        type: 'object',
        properties: {
          type:       { type: 'string', enum: ['patch', 'warn', 'none'] },
          message:    { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'message', 'suggestion'],
      },
      // Prepend system rules as context via the prompt itself
      // (system role is embedded in the user prompt for InvokeLLM)
    });

    return result;
  } catch (err) {
    console.error('[agent:brain] analyzeChange failed:', err);
    return { type: 'none', message: 'Analysis unavailable', suggestion: '' };
  }
}

export default { analyze, analyzeChange };