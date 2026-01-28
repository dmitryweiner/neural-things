// dla-sound.js - FM Synthesis sound module
// High thin clicks for particle sticking sounds
// Based on real-time oscillator FM synthesis

const DLASound = {
  audioCtx: null,
  lastSoundTime: 0,
  THROTTLE_MS: 80, // Minimum time between sounds to prevent crackling
  
  // Configurable settings (synced from main settings)
  settings: {
    enabled: true,
    masterVolume: 0.25,   // 0-1, overall volume
    pitchCoeff: 1.0,      // Multiplier for X->pitch mapping (higher = wider pitch range)
    volumeCoeff: 1.0,     // Multiplier for Y->volume mapping (higher = more volume variation)
  },
  
  /**
   * Initialize the audio context (must be called on user interaction)
   */
  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  },
  
  /**
   * Update sound settings
   * @param {Object} newSettings - Settings to merge
   */
  updateSettings(newSettings) {
    if (newSettings.enabled !== undefined) this.settings.enabled = newSettings.enabled;
    if (newSettings.masterVolume !== undefined) this.settings.masterVolume = newSettings.masterVolume;
    if (newSettings.pitchCoeff !== undefined) this.settings.pitchCoeff = newSettings.pitchCoeff;
    if (newSettings.volumeCoeff !== undefined) this.settings.volumeCoeff = newSettings.volumeCoeff;
  },
  
  /**
   * Play FM synthesis sound
   * @param {number} carrierFreq - Carrier frequency in Hz
   * @param {number} modRatio - Modulator/carrier frequency ratio
   * @param {number} modIndex - Modulation depth
   * @param {number} attack - Attack time in ms
   * @param {number} decay - Decay time in ms
   * @param {number} volume - Volume 0-1
   */
  playFM(carrierFreq, modRatio, modIndex, attack, decay, volume) {
    if (!this.audioCtx) return;
    
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    
    // Create oscillators
    const modulator = ctx.createOscillator();
    const carrier = ctx.createOscillator();
    
    // Create gain nodes
    const modulationGain = ctx.createGain();
    const envelopeGain = ctx.createGain();
    
    // Configure modulator
    modulator.frequency.value = carrierFreq * modRatio;
    modulationGain.gain.value = modIndex * carrierFreq;
    
    // Configure carrier
    carrier.frequency.value = carrierFreq;
    carrier.type = 'sine';
    modulator.type = 'sine';
    
    // Connect modulation: modulator -> modulationGain -> carrier.frequency
    modulator.connect(modulationGain);
    modulationGain.connect(carrier.frequency);
    
    // Configure envelope (attack + exponential decay)
    envelopeGain.gain.setValueAtTime(0, now);
    envelopeGain.gain.linearRampToValueAtTime(volume, now + attack / 1000);
    envelopeGain.gain.exponentialRampToValueAtTime(0.001, now + attack / 1000 + decay / 1000);
    
    // Connect to output: carrier -> envelope -> destination
    carrier.connect(envelopeGain);
    envelopeGain.connect(ctx.destination);
    
    // Start and schedule stop
    modulator.start(now);
    carrier.start(now);
    
    const totalDuration = (attack + decay + 100) / 1000;
    modulator.stop(now + totalDuration);
    carrier.stop(now + totalDuration);
  },
  
  /**
   * Play a sound based on particle position
   * @param {number} x - X coordinate of the particle
   * @param {number} y - Y coordinate of the particle
   * @param {number} maxRadius - Current max radius of the cluster (for normalization)
   */
  play(x, y, maxRadius) {
    if (!this.settings.enabled || !this.audioCtx) return;
    
    // Throttle sounds to prevent crackling from too many simultaneous plays
    const now = performance.now();
    if (now - this.lastSoundTime < this.THROTTLE_MS) return;
    this.lastSoundTime = now;
    
    // Use maxRadius for normalization, with a minimum to avoid division issues
    const radius = Math.max(maxRadius, 50);
    
    // Normalize coordinates to 0-1 range
    const normalizedX = (x / radius + 1) / 2; // 0 (left) to 1 (right)
    const normalizedY = (y / radius + 1) / 2; // 0 (top) to 1 (bottom)
    const distance = Math.min(1, Math.sqrt(x * x + y * y) / radius);
    
    // Carrier frequency depends on X position (with pitchCoeff multiplier)
    // Range: 800-2000 Hz base, wider with higher pitchCoeff
    const freqRange = 600 * this.settings.pitchCoeff;
    const carrierFreq = 1000 + (normalizedX - 0.5) * freqRange * 2 + Math.random() * 200;
    
    // Modulator ratio depends on Y (2-3 range)
    const modRatio = 2 + normalizedY;
    
    // Modulation index depends on distance from center (2-5 range)
    const modIndex = 2 + distance * 3;
    
    // Envelope
    const attack = 2; // 2ms - very fast attack
    const decay = 80 + distance * 40; // 80-120ms depending on distance
    
    // Volume based on Y position and settings
    const baseVolume = 0.15 + normalizedY * 0.25 * this.settings.volumeCoeff;
    const finalVolume = Math.min(1.0, baseVolume * this.settings.masterVolume * 2);
    
    this.playFM(carrierFreq, modRatio, modIndex, attack, decay, finalVolume);
  },
};
