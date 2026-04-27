import { defaultBrainConfig } from './systemBrainConfig';
import { resolveBrainModes } from './brainModeService';
import { classifyBrainActionRisk } from './brainRiskClassifier';
import { evaluateBrainApproval } from './brainApprovalPolicy';

const BUSINESS_PRIORITY = ['cash_flow', 'execution', 'sales', 'profitability'];

function summarizeModes(modes) {
  return {
    activeModes: modes.activeModes,
    canAnalyze: modes.canAnalyze,
    canSuggest: modes.canSuggest,
    canExecute: modes.canExecute,
    restrictions: modes.restrictions || [],
    reason: modes.reasoning?.reason || '',
  };
}

function summarizeApproval(actionType, modes, config) {
  if (!actionType) {
    return {
      evaluated: false,
      reason: 'No action type provided for approval evaluation.',
    };
  }

  const risk = classifyBrainActionRisk(actionType);
  const approval = evaluateBrainApproval({ modes, risk, config });

  return {
    evaluated: true,
    actionType,
    risk,
    approval,
  };
}

function buildPrioritySummary(results = []) {
  const resultText = results
    .flatMap(r => [
      r?.module,
      r?.page,
      r?.decision?.summary,
      r?.decision?.nextAction,
      ...(r?.decision?.suggestedActions || []),
    ])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matched = BUSINESS_PRIORITY.find(priority => {
    if (priority === 'cash_flow') return /invoice|payment|collection|balance|overdue|cash/.test(resultText);
    if (priority === 'execution') return /work order|execution|assignment|field|job/.test(resultText);
    if (priority === 'sales') return /estimate|proposal|lead|follow/.test(resultText);
    if (priority === 'profitability') return /profit|margin|cost|payroll/.test(resultText);
    return false;
  });

  return {
    order: BUSINESS_PRIORITY,
    currentPriority: matched || 'monitoring',
    reason: matched
      ? `Brain results matched ${matched} priority signals.`
      : 'No priority-specific signal detected yet.',
  };
}

export async function runSystemBrainV2({ modules = [], context = {}, config = defaultBrainConfig, actionType = null }) {
  const effectiveConfig = { ...defaultBrainConfig, ...config };
  const modes = resolveBrainModes(effectiveConfig);

  const results = [];

  for (const m of modules) {
    try {
      const r = await m({ context, config: effectiveConfig, modes });
      if (r) results.push(r);
    } catch (e) {
      console.warn('[SystemBrain] module failed', e);
    }
  }

  const modeSummary = summarizeModes(modes);
  const approvalSummary = summarizeApproval(actionType, modes, effectiveConfig);
  const prioritySummary = buildPrioritySummary(results);

  return {
    modes,
    modeSummary,
    approvalSummary,
    prioritySummary,
    results,
    meta: {
      moduleCount: modules.length,
      resultCount: results.length,
      companyContext: effectiveConfig.companyContext || null,
      analyzedAt: new Date().toISOString(),
    },
  };
}

export function evaluateAction({ actionType, config = defaultBrainConfig }) {
  const effectiveConfig = { ...defaultBrainConfig, ...config };
  const modes = resolveBrainModes(effectiveConfig);
  const risk = classifyBrainActionRisk(actionType);
  const approval = evaluateBrainApproval({ modes, risk, config: effectiveConfig });

  return {
    modes,
    modeSummary: summarizeModes(modes),
    risk,
    approval,
  };
}
