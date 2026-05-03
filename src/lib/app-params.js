/**
 * NexArtPro — App Parameters
 * Simplified version without Base44 SDK dependency.
 * Kept for backward compatibility with code that references appParams.
 */

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const getParamValue = (key, defaultValue = null) => {
  if (isNode) return defaultValue;
  const stored = storage.getItem(`nexartpro_${key}`);
  if (stored) return stored;
  if (defaultValue) {
    storage.setItem(`nexartpro_${key}`, defaultValue);
    return defaultValue;
  }
  return null;
};

export const appParams = {
  appId: getParamValue('app_id', 'nexartpro'),
  fromUrl: isNode ? '' : window.location.href,
};
