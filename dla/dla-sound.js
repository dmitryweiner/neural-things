// dla-sound.js - FM Synthesis sound module
// Short metallic/glassy sounds using frequency modulation

const DLASound = {
  audioCtx: null,
  lastSoundTime: 0,
  THROTTLE_MS: 80, // Minimum time between sounds to prevent crackling
  
  // FM Synthesis parameters
  FM_RATIO: 2.5,           // Modulator/carrier frequency ratio (non-integer = inharmonic/metallic)
  FM_INDEX: 3.0,           // Modulation index (higher = more harmonics/brightness)
  DURATION: 0.15,          // Very short duration for percussive feel
  ATTACK: 0.005,           // 5ms attack
  DECAY: 0.145,            // Rest is decay
  
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
   * Create an FM synthesis buffer
   * FM formula: output = sin(2π * fc * t + I * sin(2π * fm * t))
   * where fc = carrier freq, fm = modulator freq, I = modulation index
   * 
   * @param {number} carrierFreq - Carrier frequency in Hz
   * @param {number} duration - Duration in seconds
   * @returns {AudioBuffer|null}
   */
  createFMBuffer(carrierFreq, duration) {
    if (!this.audioCtx) return null;
    
    const sampleRate = this.audioCtx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    const fc = carrierFreq;
    const fm = carrierFreq * this.FM_RATIO; // Modulator frequency
    const I = this.FM_INDEX;                 // Modulation index
    
    const attackSamples = Math.floor(this.ATTACK * sampleRate);
    const decaySamples = samples - attackSamples;
    
    const twoPi = 2 * Math.PI;
    
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      
      // FM synthesis
      const modulator = Math.sin(twoPi * fm * t);
      const carrier = Math.sin(twoPi * fc * t + I * modulator);
      
      // Envelope: fast attack, exponential decay
      let envelope;
      if (i < attackSamples) {
        // Linear attack
        envelope = i / attackSamples;
      } else {
        // Exponential decay
        const decayPos = (i - attackSamples) / decaySamples;
        envelope = Math.exp(-decayPos * 6); // Fast exponential decay
      }
      
      data[i] = carrier * envelope;
    }
    
    return buffer;
  },
  
  /**
   * Play an FM sound based on particle position
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
    
    // x -> carrier frequency: center=660Hz, left=lower (~220Hz), right=higher (~2000Hz)
    // pitchCoeff controls the range
    const normalizedX = Math.max(-1, Math.min(1, x / radius));
    const pitchRange = this.settings.pitchCoeff;
    const carrierFreq = 660 * Math.pow(2, normalizedX * 1.5 * pitchRange); // ~220-2000 Hz range
    
    // y -> volume: top (negative y) = quieter, bottom (positive y) = louder
    // volumeCoeff controls the sensitivity
    const normalizedY = Math.max(-1, Math.min(1, y / radius));
    const volumeRange = this.settings.volumeCoeff;
    const baseGain = 0.1 + (normalizedY + 1) * 0.35 * volumeRange;
    
    // Apply master volume
    const finalGain = Math.min(1.0, baseGain * this.settings.masterVolume * 2);
    
    // Create and play the sound
    const buffer = this.createFMBuffer(carrierFreq, this.DURATION);
    if (!buffer) return;
    
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = finalGain;
    
    source.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    source.start();
  },
};
