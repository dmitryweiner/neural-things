import { b64urlEncode, b64urlDecode } from '../utils/base64url';
import type { AppState } from '../types';

/**
 * Load state from URL hash
 */
export function loadStateFromURL(): AppState | null {
  const m = location.hash.match(/#s=([A-Za-z0-9\-_]+)/);
  if (!m) return null;

  try {
    const json = b64urlDecode(m[1]);
    return JSON.parse(json) as AppState;
  } catch {
    return null;
  }
}

/**
 * Write state to URL hash
 * @returns The full URL with state encoded
 */
export function writeStateToURL(state: AppState): string {
  const json = JSON.stringify(state);
  const token = b64urlEncode(json);
  const newHash = `#s=${token}`;
  history.replaceState(null, '', newHash);
  return location.href;
}

/**
 * Clear state from URL
 */
export function clearStateFromURL(): void {
  history.replaceState(null, '', location.pathname + location.search);
}
