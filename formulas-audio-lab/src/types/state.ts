import type { EffectsState } from './effects';
import type { FormulaState } from './formula';

/**
 * Complete application state
 * This is what gets serialized to URL/localStorage
 */
export interface AppState {
  /** State format version */
  v: number;
  /** Master volume (0-1) */
  masterGain: number;
  /** Effects chain state */
  fx: EffectsState;
  /** State of each formula generator */
  formulas: Record<string, FormulaState>;
}

/**
 * Preset definition
 */
export interface Preset {
  /** Display name */
  name: string;
  /** State to apply when preset is selected */
  state: AppState;
}

/**
 * localStorage keys used by the app
 */
export const STORAGE_KEYS = {
  PRESET: 'formula_audio_lab_preset_v2',
  HELP_SHOWN: 'formula_audio_lab_help_shown',
} as const;

/**
 * Current state format version
 */
export const STATE_VERSION = 2;
