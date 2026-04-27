import { defaultBrainConfig } from './systemBrainConfig';
import { resolveBrainModes } from './brainModeService';
import { classifyBrainActionRisk } from './brainRiskClassifier';
import { evaluateBrainApproval } from './brainApprovalPolicy';

export async function runSystemBrainV2({ modules = [], context = {}, config = defaultBrainConfig }) {
  const modes = resolveBrainModes(config);

  const results = [];

  for (const m of modules) {
    try {
      const r = await m(context);
      if (r) results.push(r);
    } catch (e) {
      console.warn('[SystemBrain] module failed', e);
    }
  }

  return {
    modes,
    results,
    meta: {
      moduleCount: modules.length,
      analyzedAt: new Date().toISOString(),
    },
  };
}

export function evaluateAction({ actionType, config }) {
  const modes = resolveBrainModes(config);
  const risk = classifyBrainActionRisk(actionType);
  const approval = evaluateBrainApproval({ modes, risk });

  return { modes, risk, approval };
}
