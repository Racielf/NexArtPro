/**
 * brain/core/brainRegistry.js
 * Extensible registry for modules, pages, and system brains.
 */

const REGISTRY = {};

function buildKey(key, type = 'module') {
  return `${type}:${key}`;
}

export function registerBrain(key, fn, options = {}) {
  if (!key || typeof fn !== 'function') return;

  const type = options.type || 'module';
  const registryKey = buildKey(key, type);

  REGISTRY[registryKey] = fn;

  // Backward compatibility: also register plain key if not present
  if (!REGISTRY[key]) {
    REGISTRY[key] = fn;
  }
}

export async function runRegisteredBrain(key, payload, options = {}) {
  const type = options.type || payload?.type || 'module';
  const registryKey = buildKey(key, type);

  const fn = REGISTRY[registryKey] || REGISTRY[key];

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
