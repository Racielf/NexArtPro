/**
 * brain/core/brainCore.js
 */

import { runRegisteredBrain } from './brainRegistry';
import { aggregateBrainResults } from './brainAggregator';

export async function runPageBrain({ module, page, entity, related = {}, context = {} }) {
  const payload = { module, page, entity, related, context };

  const moduleResult = await runRegisteredBrain(module, payload);
  const pageResult = await runRegisteredBrain(page, payload);

  return aggregateBrainResults([
    moduleResult,
    pageResult,
  ].filter(Boolean), {
    module,
    page,
  });
}

export async function runSystemBrain({ modules = [], context = {} }) {
  const results = [];

  for (const m of modules) {
    const r = await runRegisteredBrain(m, { module: m, context });
    if (r) results.push(r);
  }

  return aggregateBrainResults(results, {
    module: 'system',
    page: 'global',
  });
}
