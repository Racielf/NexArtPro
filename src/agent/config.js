/**
 * agent/config.js
 * Core rules and configuration for the internal agent module.
 */

export const AGENT_RULES = {
  no_break_backend: {
    id: 'no_break_backend',
    description: 'Never modify backend functions in a way that breaks existing API contracts.',
    severity: 'critical',
  },
  surgical_changes: {
    id: 'surgical_changes',
    description: 'Apply the minimum change needed. Avoid sweeping refactors unless explicitly requested.',
    severity: 'high',
  },
  avoid_duplication: {
    id: 'avoid_duplication',
    description: 'Before creating new logic, check if it already exists in the codebase.',
    severity: 'medium',
  },
};

export const AGENT_CONFIG = {
  name: 'rc-art-agent',
  version: '0.1.0',
  enabled: true,
  rules: Object.values(AGENT_RULES),
};

export default AGENT_CONFIG;