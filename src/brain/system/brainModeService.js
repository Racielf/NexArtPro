export function resolveBrainModes(config = {}) {
  const {
    writeMode,
    decisionMode,
    observationMode,
    learningMode,
  } = config;

  const canAnalyze = true;
  const canSuggest = !observationMode;

  let canExecute = writeMode && decisionMode;

  if (observationMode || learningMode) {
    canExecute = false;
  }

  return {
    activeModes: { writeMode, decisionMode, observationMode, learningMode },
    canAnalyze,
    canSuggest,
    canExecute,
    reasoning: {
      executionBlocked: observationMode || learningMode || !writeMode || !decisionMode,
    },
  };
}
