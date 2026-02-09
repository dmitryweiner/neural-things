/* ================================================================
   NT-Canvas  –  Neural-Things shared canvas utilities
   ================================================================
   Include via:  <script src="../lib/nt-canvas.js"></script>
   Exposes:  window.NT.canvas
   ================================================================ */

window.NT = window.NT || {};
window.NT.canvas = (() => {
  'use strict';

  // -------- DPR-aware canvas resize --------

  /**
   * Resize a <canvas> to match its CSS layout size × devicePixelRatio.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {number}           [dpr]  – override devicePixelRatio
   * @returns {{ width: number, height: number }}  pixel dimensions
   */
  function resizeCanvas(canvas, dpr) {
    dpr = dpr || (window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    return { width: canvas.width, height: canvas.height };
  }

  // -------- Spectrogram color palette --------

  /**
   * Convert a 0-255 magnitude value to an HSL color string.
   * Maps blue (quiet) → red (loud) with lightness 20%–60%.
   *
   * @param {number} value  0–255
   * @returns {string}  e.g. "hsl(120, 100%, 35%)"
   */
  function getSpectroColor(value) {
    const v = Math.min(255, Math.max(0, value));
    const hue       = 240 - (v / 255) * 240;
    const lightness = 20  + (v / 255) * 40;
    return `hsl(${hue}, 100%, ${lightness}%)`;
  }

  // -------- Animation loop with visibility handling --------

  /**
   * Create a managed requestAnimationFrame loop.
   *
   * @param {Function} drawFn            – called every frame
   * @param {Object}  [opts]
   * @param {Function} [opts.onVisibilityChange]  – callback(isVisible)
   * @returns {{ start(), stop(), isRunning() }}
   */
  function createAnimationLoop(drawFn, opts) {
    opts = opts || {};
    let rafId = null;
    let _running = false;
    let _visible = !document.hidden;

    function loop() {
      if (!_running) return;
      rafId = requestAnimationFrame(loop);
      if (_visible) drawFn();
    }

    function onVis() {
      _visible = document.visibilityState === 'visible';
      if (opts.onVisibilityChange) opts.onVisibilityChange(_visible);
    }

    function start() {
      if (_running) return;
      _running = true;
      document.addEventListener('visibilitychange', onVis);
      loop();
    }

    function stop() {
      _running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('visibilitychange', onVis);
    }

    return {
      start,
      stop,
      isRunning: () => _running,
    };
  }

  // -------- Public API --------
  return {
    resizeCanvas,
    getSpectroColor,
    createAnimationLoop,
  };
})();
