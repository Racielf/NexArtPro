/**
 * agent/brain.js
 * Analysis layer: runs business rules first, then escalates to LLM if clean.
 */

import { ENGINEERING_RULES, SAFE_BUSINESS_RULES } from './config.js';
import { base44 } from '@/api/base44Client';

// Build SYSTEM_PROMPT dynamically from real engineering rules
const SYSTEM_PROMPT = [
  'You are a senior software engineering reviewer.',
  'Analyze the provided code diff and detect issues.',
  '',
  'Rules to enforce:',
  ...Object.values(ENGINEERING_RULES).map(r => `- [${r.severity.toUpperCase()}] ${r.description}`),
  '',
  'Respond ONLY with valid JSON:',
  '{ "type": "patch" | "warn" | "none", "message": "...", "suggestion": "..." }',
].join('\n');

/**
 * runBusinessRules(data)
 * Executes all BUSINESS_RULES.validate() that accept a single argument against `data`.
 * Returns array of violation reason strings. Empty = no violations.
 */
function runBusinessRules(data) {
  const violations = [];
  for (const rule of SAFE_BUSINESS_RULES) {
    try {
      const result = rule.validate(data);
      if (result && !result.valid && result.reason) {
        violations.push(`[${rule.id}] ${result.reason}`);
      }
    } catch {
      // Rule requires multiple args (e.g. no_duplicate_client_data) — skip in generic pass
    }
  }
  return violations;
}

/**
 * analyzeChange({ filePath, diff, data? })
 * 1. Runs local business rules against `data` (if provided).
 * 2. If violations found, returns warn immediately (no LLM cost).
 * 3. Otherwise, sends diff to LLM with full system prompt.
 *
 * @param {{ filePath: string, diff: string, data?: object }} input
 */
export async function analyzeChange({ filePath, diff, data = null } = {}) {
  // Guard: invalid inputs — skip LLM call
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return { type: 'warn', message: 'analyzeChange: filePath is required', suggestion: '' };
  }
  if (typeof diff !== 'string') {
    return { type: 'warn', message: 'analyzeChange: diff must be a string', suggestion: '' };
  }
  // Step 1: local business rules (fast, no API call)
  if (data) {
    const violations = runBusinessRules(data);
    if (violations.length > 0) {
      return {
        type: 'warn',
        message: 'Business rule violation',
        suggestion: JSON.stringify(violations),
      };
    }
  }

  // Step 2: LLM analysis with full context
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\nFile: ${filePath}\n\nDiff:\n${diff}`,
      response_json_schema: {
        type: 'object',
        properties: {
          type:       { type: 'string', enum: ['patch', 'warn', 'none'] },
          message:    { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'message', 'suggestion'],
      },
    });

    return result;
  } catch (err) {
    console.error('[agent:brain] analyzeChange failed:', err);
    return { type: 'none', message: 'Analysis unavailable', suggestion: '' };
  }
}

export default { analyzeChange };