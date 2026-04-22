/**
 * brain/core/brainRegistry.js
 * Extensible registry for modules and pages.
 */

const REGISTRY = {};

export function registerBrain(key, fn) {
  if (!key || typeof fn !== 'function') return;
  REGISTRY[key] = fn;
}

export async function runRegisteredBrain(key, payload) {
  const fn = REGISTRY[key];
  if (!fn) return null;
  try {
    return await fn(payload);
  } catch (err) {
    console.error('[BrainRegistry] Error in', key, err);
    return null;
  }
}

export function getRegisteredBrains() {
  return { ...REGISTRY };
}
