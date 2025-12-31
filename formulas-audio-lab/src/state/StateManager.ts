import { loadStateFromURL, writeStateToURL } from './URLState';
import {
  savePreset,
  loadPreset,
  hasSeenHelp,
  markHelpShown,
} from './LocalStorage';
import { DEFAULT_FX, DEFAULT_MASTER_GAIN, STATE_VERSION } from '../config';
import { FORMULAS } from '../config/formulas';
import type { AppState, EffectsState, FormulaState } from '../types';

/**
 * Central state manager
 * Coordinates reading/writing state from UI, URL, and localStorage
 */
export class StateManager {
  /**
   * Get default state with all formulas disabled
   */
  getDefaultState(): AppState {
    const formulas: Record<string, FormulaState> = {};

    for (const f of FORMULAS) {
      const params: Record<string, number> = {};
      for (const s of f.sliders) {
        params[s.k] = s.value;
      }
      formulas[f.id] = { enabled: false, params };
    }

    return {
      v: STATE_VERSION,
      masterGain: DEFAULT_MASTER_GAIN,
      fx: { ...DEFAULT_FX },
      formulas,
    };
  }

  /**
   * Get default effects state
   */
  getDefaultFX(): EffectsState {
    return { ...DEFAULT_FX };
  }

  /**
   * Load state from URL hash
   */
  loadFromURL(): AppState | null {
    return loadStateFromURL();
  }

  /**
   * Save state to URL hash
   */
  saveToURL(state: AppState): string {
    return writeStateToURL(state);
  }

  /**
   * Save state to localStorage as user preset
   */
  saveToStorage(state: AppState): void {
    savePreset(state);
  }

  /**
   * Load state from localStorage
   */
  loadFromStorage(): AppState | null {
    return loadPreset();
  }

  /**
   * Check if help popup has been shown before
   */
  hasSeenHelp(): boolean {
    return hasSeenHelp();
  }

  /**
   * Mark help as shown (don't auto-show again)
   */
  markHelpShown(): void {
    markHelpShown();
  }

  /**
   * Merge partial state with defaults
   * Useful when loading presets that may not have all fields
   */
  mergeWithDefaults(partial: Partial<AppState>): AppState {
    const defaults = this.getDefaultState();

    return {
      v: partial.v ?? defaults.v,
      masterGain: partial.masterGain ?? defaults.masterGain,
      fx: { ...defaults.fx, ...partial.fx },
      formulas: { ...defaults.formulas, ...partial.formulas },
    };
  }
}
