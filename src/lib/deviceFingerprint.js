let cachedFingerprintPromise = null;

async function sha256Hex(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceFingerprint() {
  if (cachedFingerprintPromise) return cachedFingerprintPromise;

  cachedFingerprintPromise = (async () => {
    const payload = {
      userAgent: navigator.userAgent || '',
      language: navigator.language || '',
      languages: Array.isArray(navigator.languages) ? navigator.languages.join(',') : '',
      platform: navigator.platform || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      colorDepth: window.screen?.colorDepth || 0,
      pixelRatio: window.devicePixelRatio || 1,
      memory: navigator.deviceMemory || 0,
      touchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
    };

    const hex = await sha256Hex(JSON.stringify(payload));
    return `nexartsign_${hex}`;
  })();

  return cachedFingerprintPromise;
}
