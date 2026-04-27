import { defaultBrainConfig } from './systemBrainConfig';

export function resolveBrainModes(config = {}) {
  const effectiveConfig = { ...defaultBrainConfig, ...config };
  const {
    writeMode = false,
    decisionMode = false,
    observationMode = false,
    learningMode = false,
  } = effectiveConfig;

  const restrictions = [];
  if (!writeMode) restrictions.push('write_mode_disabled');
  if (!decisionMode) restrictions.push('decision_mode_disabled');
  if (observationMode) restrictions.push('observation_mode_analyze_only');
  if (learningMode) restrictions.push('learning_mode_no_production_writes');

  const canAnalyze = true;
  const canSuggest = !learningMode || observationMode || !decisionMode ? true : true;
  const canExecute = Boolean(writeMode && decisionMode && !observationMode && !learningMode);

  return {
    activeModes: {
      writeMode: Boolean(writeMode),
      decisionMode: Boolean(decisionMode),
      observationMode: Boolean(observationMode),
      learningMode: Boolean(learningMode),
    },
    canAnalyze,
    canSuggest,
    canExecute,
    restrictions,
    reasoning: {
      mostRestrictiveModeWins: true,
      executionBlocked: !canExecute,
      reason: restrictions.length
        ? `Execution restricted by: ${restrictions.join(', ')}`
        : 'Execution is available, subject to approval policy.',
    },
  };
}
