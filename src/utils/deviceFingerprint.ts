const DEVICE_TOKEN_STORAGE_KEY = 'vagou_device_fp_token';
const DEVICE_HASH_CACHE_KEY = 'vagou_device_fp_hash';

function fnv1aHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const partA = (h1 >>> 0).toString(16).padStart(8, '0');
  const partB = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${partA}${partB}${partA}${partB}`;
}

function getOrCreatePersistentToken(): string {
  if (typeof window === 'undefined') return 'ssr-device';
  try {
    const existing = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    if (existing && existing.length >= 16) return existing;
    const nextToken =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, nextToken);
    return nextToken;
  } catch {
    return 'ephemeral-device';
  }
}

export function createPlacesSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `gmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr-device-hash';

  try {
    const cached = sessionStorage.getItem(DEVICE_HASH_CACHE_KEY);
    if (cached && cached.length >= 16) return cached;
  } catch {}

  const token = getOrCreatePersistentToken();
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();

  const rawSignals = [
    token,
    navigator.userAgent || '',
    navigator.language || '',
    tz,
    String(window.screen?.width || 0),
    String(window.screen?.height || 0),
    String(window.screen?.colorDepth || 0),
    String(navigator.hardwareConcurrency || 0),
  ].join('|');

  let digestHex = '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const encoded = new TextEncoder().encode(rawSignals);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      digestHex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    }
  } catch {}

  if (!digestHex) {
    digestHex = fnv1aHex(rawSignals);
  }

  try {
    sessionStorage.setItem(DEVICE_HASH_CACHE_KEY, digestHex);
  } catch {}

  return digestHex;
}
