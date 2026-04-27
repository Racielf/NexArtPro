/**
 * brain/core/brainCore.js
 */

import { runRegisteredBrain } from './brainRegistry';
import { aggregateBrainResults } from './brainAggregator';

export async function runPageBrain({ module, page, entity, related = {}, context = {}, config = null }) {
  const payload = { module, page, entity, related, context, config };

  const moduleResult = await runRegisteredBrain(module, payload);
  const pageResult = await runRegisteredBrain(page, payload);

  return aggregateBrainResults([
    moduleResult,
    pageResult,
  ].filter(Boolean), {
    module,
    page,
    companyContext: config && config.companyContext ? config.companyContext : null,
  });
}

export async function runSystemBrain({ modules = [], context = {}, config = null }) {
  const results = [];

  for (const m of modules) {
    const r = await runRegisteredBrain(m, { module: m, context, config });
    if (r) results.push(r);
  }

  const aggregated = aggregateBrainResults(results, {
    module: 'system',
    page: 'global',
  });

  return {
    ...aggregated,
    systemMeta: {
      companyContext: config && config.companyContext ? config.companyContext : null,
      configAttached: Boolean(config),
      moduleCount: modules.length,
      analyzedAt: new Date().toISOString(),
    },
  };
}
