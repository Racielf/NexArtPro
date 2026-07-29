// PBKDF2-SHA256 hashing for short numeric PINs (field-agent quick login). Stored as
// "iterations:saltHex:hashHex" in app_users.pin_hash. Uses Web Crypto (built into Deno),
// no external dependency.
const ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function derive(pin: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return `${ITERATIONS}:${toHex(salt.buffer)}:${hash}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [iterationsStr, saltHex, hashHex] = String(stored || '').split(':');
  const iterations = Number(iterationsStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const candidate = await derive(pin, fromHex(saltHex), iterations);
  if (candidate.length !== hashHex.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
