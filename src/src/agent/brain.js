/**
 * agent/brain.js
 * Analysis layer: runs business rules first, then escalates to LLM if clean.
 */

import { SAFE_ENGINEERING_RULES, SAFE_BUSINESS_RULES, DIFF_RULES, BUSINESS_RULES, ESTIMATE_AGENT_CONTEXT } from './config.js';
import { base44 } from '@/api/base44Client';

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
].join('\n');

function runBusinessRules(data) {
  const violations = [];
  for (const rule of SAFE_BUSINESS_RULES) {
    try {
      const result = rule.validate(data);
      if (result && !result.valid && result.reason) {
        violations.push(`[${rule.id}] ${result.reason}`);
      }
    } catch {}
  }
  return violations;
}

function runDiffRules({ filePath, diff }) {
  for (const rule of DIFF_RULES) {
    try {
      const result = rule.validate({ filePath, diff });
      if (result && !result.valid) {
        return {
          type: result.type || 'warn',
          message: result.message || `Rule "${rule.id}" violated`,
          suggestion: rule.suggestion || result.suggestion || `Fix violation of rule "${rule.id}".`,
        };
      }
    } catch {}
  }
  return null;
}

/**
 * analyzeEstimateContext — NEW (READ-ONLY)
 * Performs contextual audit for Estimate module (no writes, no fixes)
 */
export function analyzeEstimateContext({ filePath = '', content = '', data = null } = {}) {
  const inEstimate = ESTIMATE_AGENT_CONTEXT.PATHS.some(re => re.test(filePath));
  if (!inEstimate) {
    return { type: 'warn', message: 'Not an Estimate module path', suggestion: '' };
  }

  const issues = [];

  // 1. Detect direct Client usage in Estimate module
  if (content && /\bClient\.(list|filter|create|update|delete|get)\b/.test(content) && !/EstimateSidebarCustomer/i.test(filePath)) {
    issues.push('Direct Client entity usage detected in Estimate module');
  }

  // 2. Detect mixed client_id / customer_id in content
  if (content && /client_id\s*[:=]/.test(content) && /customer_id\s*[:=]/.test(content)) {
    issues.push('Mixed client_id and customer_id detected in same file');
  }

  // 3. Detect legacy UI labels
  if (content) {
    const foundLabels = ESTIMATE_AGENT_CONTEXT.LEGACY_LABELS.filter(l => content.includes(l));
    if (foundLabels.length > 0) {
      issues.push(`Legacy UI labels detected: ${foundLabels.join(', ')}`);
    }
  }

  // 4. Detect suspicious status strings
  if (content) {
    const foundStatuses = ESTIMATE_AGENT_CONTEXT.SUSPICIOUS_STATUS_STRINGS.filter(s => content.includes(`'${s}'`) || content.includes(`"${s}"`));
    if (foundStatuses.length > 0) {
      issues.push(`Non-standard estimate status strings present: ${foundStatuses.join(', ')}`);
    }
  }

  // 5. Validate runtime data if provided
  if (data) {
    const statusRule = BUSINESS_RULES.valid_estimate_status.validate(data);
    if (!statusRule.valid) issues.push(statusRule.reason);

    const mixRule = BUSINESS_RULES.no_mixed_client_customer.validate(data);
    if (!mixRule.valid) issues.push(mixRule.reason);
  }

  if (issues.length === 0) {
    return { type: 'none', message: 'Estimate context clean', suggestion: '' };
  }

  return {
    type: 'warn',
    message: 'Estimate context issues detected',
    suggestion: issues.join(' | '),
  };
}

export async function analyzeChange({ filePath, diff, data = null } = {}) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return { type: 'warn', message: 'analyzeChange: filePath is required', suggestion: '' };
  }
  if (typeof diff !== 'string') {
    return { type: 'warn', message: 'analyzeChange: diff must be a string', suggestion: '' };
  }

  const diffViolation = runDiffRules({ filePath, diff });
  if (diffViolation) return diffViolation;

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

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\nFile: ${filePath}\n\nDiff:\n${diff}`,
      response_json_schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['patch', 'warn', 'none'] },
          message: { type: 'string' },
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

export default { analyzeChange, analyzeEstimateContext };