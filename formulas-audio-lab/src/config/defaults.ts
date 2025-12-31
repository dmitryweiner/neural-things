import type { EffectsState } from '../types';

/**
 * Default master gain value
 */
export const DEFAULT_MASTER_GAIN = 0.25;

/**
 * Default effects state - all effects OFF with sensible default values
 */
export const DEFAULT_FX: EffectsState = {
  // Filter
  filterOn: false,
  filterType: 'lowpass',
  filterFreq: 1000,
  filterQ: 0.7,
  // Chorus
  chorusOn: false,
  chorusMode: 'chorus',
  chorusRate: 0.35,
  chorusDepth: 6,
  chorusMix: 0.35,
  chorusFb: 0.15,
  // Reverb
  reverbOn: false,
  reverbDecay: 2.8,
  reverbMix: 0.25,
  // Limiter
  limiterOn: false,
  limiterThr: -12,
  limiterRel: 0.15,
  // Delay
  delayOn: false,
  delayTime: 0.35,
  delayFb: 0.4,
  delayMix: 0.3,
  // Phaser
  phaserOn: false,
  phaserRate: 0.5,
  phaserDepth: 0.7,
  phaserStages: 4,
  phaserFb: 0.3,
  phaserMix: 0.5,
};

/**
 * Current state format version
 */
export const STATE_VERSION = 2;
