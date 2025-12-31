import { STORAGE_KEYS } from '../types';
import type { AppState } from '../types';

/**
 * Save preset to localStorage
 */
export function savePreset(state: AppState): void {
  localStorage.setItem(STORAGE_KEYS.PRESET, JSON.stringify(state));
}

/**
 * Load preset from localStorage
 */
export function loadPreset(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEYS.PRESET);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

/**
 * Check if preset exists in localStorage
 */
export function hasPreset(): boolean {
  return localStorage.getItem(STORAGE_KEYS.PRESET) !== null;
}

/**
 * Delete preset from localStorage
 */
export function deletePreset(): void {
  localStorage.removeItem(STORAGE_KEYS.PRESET);
}

/**
 * Check if help has been shown before
 */
export function hasSeenHelp(): boolean {
  return localStorage.getItem(STORAGE_KEYS.HELP_SHOWN) === 'true';
}

/**
 * Mark help as shown
 */
export function markHelpShown(): void {
  localStorage.setItem(STORAGE_KEYS.HELP_SHOWN, 'true');
}
