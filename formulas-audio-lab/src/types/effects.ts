/**
 * Filter effect parameters
 */
export interface FilterParams {
  on: boolean;
  type: BiquadFilterType;
  freq: number;
  q: number;
}

/**
 * Chorus/Flanger effect parameters
 */
export interface ChorusParams {
  on: boolean;
  mode: 'chorus' | 'flanger';
  rate: number;
  depth: number;
  mix: number;
  feedback: number;
}

/**
 * Reverb effect parameters
 */
export interface ReverbParams {
  on: boolean;
  decay: number;
  mix: number;
}

/**
 * Limiter effect parameters
 */
export interface LimiterParams {
  on: boolean;
  threshold: number;
  release: number;
}

/**
 * Delay effect parameters
 */
export interface DelayParams {
  on: boolean;
  time: number;
  feedback: number;
  mix: number;
}

/**
 * Phaser effect parameters
 */
export interface PhaserParams {
  on: boolean;
  rate: number;
  depth: number;
  stages: number;
  feedback: number;
  mix: number;
}

/**
 * Complete effects state as stored in app state
 * Uses flat keys for URL serialization compatibility
 */
export interface EffectsState {
  // Filter
  filterOn: boolean;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  // Chorus
  chorusOn: boolean;
  chorusMode: 'chorus' | 'flanger';
  chorusRate: number;
  chorusDepth: number;
  chorusMix: number;
  chorusFb: number;
  // Reverb
  reverbOn: boolean;
  reverbDecay: number;
  reverbMix: number;
  // Limiter
  limiterOn: boolean;
  limiterThr: number;
  limiterRel: number;
  // Delay
  delayOn: boolean;
  delayTime: number;
  delayFb: number;
  delayMix: number;
  // Phaser
  phaserOn: boolean;
  phaserRate: number;
  phaserDepth: number;
  phaserStages: number;
  phaserFb: number;
  phaserMix: number;
}
