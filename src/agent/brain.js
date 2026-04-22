/**
 * agent/brain.js
 * Analysis layer: runs business rules first, then escalates to LLM if clean.
 */

import { SAFE_ENGINEERING_RULES, SAFE_BUSINESS_RULES, DIFF_RULES } from './config.js';
import { base44 } from '@/api/base44Client';

// Build SYSTEM_PROMPT dynamically from safe engineering rules
const SYSTEM_PROMPT = [
  'You are a senior software engineering reviewer.',
  'Analyze the provided code diff and detect issues.',
  '',
  'Rules to enforce:',
  ...SAFE_ENGINEERING_RULES.map(r => `- [${(r.severity || 'info').toUpperCase()}] ${r.description || r.id}`),
  '',
  'Respond ONLY with valid JSON:',
  '{ "type": "patch" | "warn" | "none", "message": "...", "suggestion": "..." }',
  '',
  'IMPORTANT: "suggestion" must always be a concrete, actionable fix — never empty or vague.',
  'Example: "Replace base44.entities.Client with base44.entities.Customer and update client_id references to customer_id."',
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
 * runDiffRules({ filePath, diff })
 * Executes all DIFF_RULES against the raw filePath + diff string.
 * Returns the first violation found, or null if all pass.
 * @returns {{ type: string, message: string, suggestion: string } | null}
 */
function runDiffRules({ filePath, diff }) {
  for (const rule of DIFF_RULES) {
    try {
      const result = rule.validate({ filePath, diff });
      if (result && !result.valid) {
        return {
          type: result.type || 'warn',
          message: result.message || `Rule "${rule.id}" violated`,
          // rule.suggestion (top-level) is the canonical fix — always present
          suggestion: rule.suggestion || result.suggestion || `Fix violation of rule "${rule.id}".`,
        };
      }
    } catch {
      // Malformed rule — skip silently
    }
  }
  return null;
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
  // Step 1a: diff/file pattern rules — CRM-specific, no LLM needed
  const diffViolation = runDiffRules({ filePath, diff });
  if (diffViolation) return diffViolation;

  // Step 1b: local business rules against structured data (fast, no API call)
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

  // Step 2: LLM analysis with full context (fallback only)
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