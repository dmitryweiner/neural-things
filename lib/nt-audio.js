/* ================================================================
   NT-Audio  –  Neural-Things shared audio utilities
   ================================================================
   Include via:  <script src="../lib/nt-audio.js"></script>
   Exposes:  window.NT.audio
   ================================================================ */

window.NT = window.NT || {};
window.NT.audio = (() => {
  'use strict';

  // -------- AudioContext creation --------

  /**
   * Create an AudioContext with iOS Safari workaround.
   * If state is 'suspended', automatically resumes.
   *
   * @param {Object} [opts]  – options passed to AudioContext constructor
   * @returns {Promise<AudioContext>}
   */
  async function createContext(opts) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(
      opts || { latencyHint: 'interactive' }
    );

    // iOS Safari: AudioContext may start in suspended state
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    return ctx;
  }

  // -------- AudioWorklet from inline code --------

  /**
   * Register an AudioWorklet processor from an inline code string.
   *
   * @param {AudioContext} ctx   – audio context
   * @param {string}       code  – full JS source of the AudioWorkletProcessor
   * @returns {Promise<string>}  – the blob URL (caller can revoke if needed)
   */
  async function createWorkletFromCode(ctx, code) {
    const blob = new Blob([code], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    return url;
  }

  // -------- WAV encoding --------

  /**
   * Encode a Float32Array of samples into a WAV Blob (16-bit PCM).
   *
   * @param {Float32Array} samples
   * @param {number}       sampleRate
   * @param {number}       [numChannels=1]
   * @returns {Blob}
   */
  function encodeWAV(samples, sampleRate, numChannels) {
    numChannels = numChannels || 1;
    const bitsPerSample  = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign     = numChannels * bytesPerSample;
    const byteRate       = sampleRate * blockAlign;
    const dataSize       = samples.length * bytesPerSample;
    const buffer         = new ArrayBuffer(44 + dataSize);
    const view           = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');

    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);        // chunk size
    view.setUint16(20, 1, true);         // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Float32 → 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // -------- Wake Lock --------

  const wakeLock = (() => {
    let _lock = null;

    /**
     * Acquire a screen wake lock. Safe to call repeatedly.
     * @returns {Promise<boolean>} true if acquired
     */
    async function acquire() {
      if (!('wakeLock' in navigator)) return false;
      try {
        _lock = await navigator.wakeLock.request('screen');
        _lock.addEventListener('release', () => { _lock = null; });
        return true;
      } catch (err) {
        console.log('Wake Lock error:', err.name, err.message);
        return false;
      }
    }

    /**
     * Release the current wake lock.
     */
    async function release() {
      if (_lock) {
        await _lock.release();
        _lock = null;
      }
    }

    /** @returns {boolean} */
    function isActive() {
      return _lock !== null;
    }

    return { acquire, release, isActive };
  })();

  // -------- Public API --------
  return {
    createContext,
    createWorkletFromCode,
    encodeWAV,
    wakeLock,
  };
})();
