// dla-sound.js - Karplus-Strong sound synthesis module
// Based on https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis

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
   * Create a Karplus-Strong pluck sound buffer
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @returns {AudioBuffer|null}
   */
  createKSBuffer(frequency, duration = 0.5) {
    if (!this.audioCtx) return null;
    
    const sampleRate = this.audioCtx.sampleRate;
    const samples = Math.ceil(sampleRate * duration);
    const period = Math.max(2, Math.round(sampleRate / frequency));
    const buffer = this.audioCtx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Use a ring buffer for the delay line
    const delayLine = new Float32Array(period);
    
    // Initialize delay line with filtered noise (less harsh)
    let prev = 0;
    for (let i = 0; i < period; i++) {
      // Low-pass filtered noise for softer attack
      const noise = Math.random() * 2 - 1;
      delayLine[i] = 0.5 * noise + 0.5 * prev;
      prev = delayLine[i];
    }
    
    // Karplus-Strong synthesis with proper feedback
    let readPos = 0;
    const decay = 0.995; // Decay factor
    const blend = 0.5;   // Low-pass blend (classic KS uses 0.5)
    
    for (let i = 0; i < samples; i++) {
      // Read current sample
      const current = delayLine[readPos];
      
      // Calculate next position with wrapping
      const nextPos = (readPos + 1) % period;
      
      // Low-pass filter (averaging) + decay
      const filtered = decay * (blend * current + (1 - blend) * delayLine[nextPos]);
      
      // Write back to delay line
      delayLine[readPos] = filtered;
      
      // Output with soft envelope to avoid clicks
      let envelope = 1.0;
      const fadeIn = 50;   // samples
      const fadeOut = 500; // samples
      if (i < fadeIn) {
        envelope = i / fadeIn;
      } else if (i > samples - fadeOut) {
        envelope = (samples - i) / fadeOut;
      }
      
      data[i] = current * envelope;
      
      // Advance read position
      readPos = nextPos;
    }
    
    return buffer;
  },
  
  /**
   * Play a stick sound based on particle position
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
    
    // x -> frequency: center=440Hz, left=lower, right=higher
    // pitchCoeff controls the range (1.0 = 2 octaves: 220-880 Hz)
    const normalizedX = Math.max(-1, Math.min(1, x / radius));
    const pitchRange = this.settings.pitchCoeff; // How many octaves to span
    const frequency = 440 * Math.pow(2, normalizedX * pitchRange); // Base 440Hz
    
    // y -> volume: top (negative y) = quieter, bottom (positive y) = louder
    // volumeCoeff controls the sensitivity
    const normalizedY = Math.max(-1, Math.min(1, y / radius));
    const volumeRange = this.settings.volumeCoeff;
    const baseGain = 0.1 + (normalizedY + 1) * 0.35 * volumeRange; // 0.1 to variable max
    
    // Apply master volume
    const finalGain = Math.min(1.0, baseGain * this.settings.masterVolume * 2);
    
    // Create and play the sound
    const buffer = this.createKSBuffer(frequency, 0.3);
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
