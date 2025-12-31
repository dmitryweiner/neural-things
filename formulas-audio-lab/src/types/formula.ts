/**
 * Configuration for a slider control in a formula card
 */
export interface SliderConfig {
  /** Parameter key used in the audio worklet */
  k: string;
  /** Display name for the slider */
  name: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Default value */
  value: number;
}

/**
 * Configuration for a formula (sound generator)
 */
export interface FormulaConfig {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Short tag/category label */
  tag: string;
  /** Mathematical description */
  desc: string;
  /** Slider configurations for this formula */
  sliders: SliderConfig[];
  /** Whether this formula has a reset state button */
  hasReset?: boolean;
}

/**
 * Runtime state of a formula
 */
export interface FormulaState {
  /** Whether the formula is currently enabled */
  enabled: boolean;
  /** Current parameter values */
  params: Record<string, number>;
}

/**
 * All formula IDs as a union type
 */
export type FormulaId =
  | 'fm'
  | 'am'
  | 'logistic'
  | 'gliss'
  | 'additive'
  | 'pm'
  | 'beats'
  | 'dist'
  | 'quasi'
  | 'lorenz'
  | 'karplus'
  | 'bitcrush'
  | 'noiselp'
  | 'pinknoise'
  | 'brownnoise'
  | 'velvetnoise'
  | 'rossler'
  | 'shepard';
