/**
 * Defensive browser-local persistence for the StitchFlow demo.
 *
 * This is intentionally not a replacement for server-side persistence,
 * authentication, authorization, or backups.
 */
const STORAGE_NAMESPACE = 'stitchflow_';

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_NAMESPACE}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readStorageString(key: string, fallback: string): string {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_NAMESPACE}${key}`);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : raw;
    } catch {
      return raw;
    }
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(`${STORAGE_NAMESPACE}${key}`, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full; the in-memory demo remains usable.
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(`${STORAGE_NAMESPACE}${key}`);
  } catch {
    // Ignore unavailable storage.
  }
}

export function clearStitchFlowStorage(): void {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_NAMESPACE))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore unavailable storage; in-memory state still resets.
  }
}
