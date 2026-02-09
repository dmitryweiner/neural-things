/* ================================================================
   NT-UI  –  Neural-Things shared UI utilities
   ================================================================
   Include via:  <script src="../lib/nt-ui.js"></script>
   Exposes:  window.NT.ui
   ================================================================ */

window.NT = window.NT || {};
window.NT.ui = (() => {
  'use strict';

  // -------- DOM helpers --------

  /** querySelector shorthand */
  const $ = (s) => document.querySelector(s);

  /** querySelectorAll shorthand */
  const $$ = (s) => document.querySelectorAll(s);

  // -------- Formatting --------

  /**
   * Smart number formatting.
   * - If `decimals` is supplied, uses fixed decimals (sonar-style).
   * - Otherwise auto-picks precision (formulas-audio-lab-style):
   *   |v| >= 100 → integer, |v| >= 10 → 2 dec, else 3 dec.
   */
  function fmt(v, decimals) {
    v = Number(v);
    if (typeof decimals === 'number') {
      if (decimals === 0) return String(Math.round(v));
      return v.toFixed(decimals);
    }
    // auto mode
    if (Math.abs(v) >= 100) return String(Math.round(v));
    if (Math.abs(v) >= 10)  return v.toFixed(2);
    return v.toFixed(3);
  }

  // -------- Toggle (Start/Stop) button --------

  /**
   * Wire up a start/stop toggle button.
   *
   * @param {HTMLElement} el         – the button element
   * @param {Object}      opts
   * @param {Function}    opts.onStart   – called when transitioning to "running"
   * @param {Function}    opts.onStop    – called when transitioning to "idle"
   * @param {string}     [opts.startText='▶ Start']
   * @param {string}     [opts.stopText='⏹ Stop']
   * @param {string}     [opts.runningClass='running'] – CSS class for running state
   * @returns {{ isRunning(), setRunning(bool), toggle() }}
   */
  function createToggleButton(el, opts) {
    const startText   = opts.startText   || '▶ Start';
    const stopText    = opts.stopText    || '⏹ Stop';
    const runningCls  = opts.runningClass || 'running';
    let running = false;

    function setRunning(state) {
      running = !!state;
      el.textContent = running ? stopText : startText;
      el.classList.toggle(runningCls, running);
    }

    async function toggle() {
      if (running) {
        await Promise.resolve(opts.onStop());
        setRunning(false);
      } else {
        el.disabled = true;
        try {
          await Promise.resolve(opts.onStart());
          setRunning(true);
        } catch (e) {
          console.error('Toggle start failed:', e);
          setRunning(false);
          throw e;
        } finally {
          el.disabled = false;
        }
      }
    }

    el.addEventListener('click', () => toggle());

    // Set initial label
    el.textContent = startText;

    return {
      isRunning: () => running,
      setRunning,
      toggle,
    };
  }

  // -------- Collapsible panel --------

  /**
   * Wire up a collapsible panel.
   *
   * @param {HTMLElement}  btnEl   – the toggle button
   * @param {HTMLElement}  panelEl – the panel / body element
   * @param {Object}      [opts]
   * @param {string}      [opts.openClass='open']     – class added when open
   * @param {boolean}     [opts.useCollapsed=false]    – if true, uses 'collapsed' class (inverted logic)
   * @param {Function}    [opts.onToggle]              – callback(isOpen)
   * @returns {{ isOpen(), setOpen(bool), toggle() }}
   */
  function createCollapsiblePanel(btnEl, panelEl, opts) {
    opts = opts || {};
    const openClass    = opts.openClass || 'open';
    const useCollapsed = !!opts.useCollapsed;
    const onToggle     = opts.onToggle || null;

    function isOpen() {
      if (useCollapsed) return !panelEl.classList.contains('collapsed');
      return panelEl.classList.contains(openClass);
    }

    function setOpen(open) {
      if (useCollapsed) {
        panelEl.classList.toggle('collapsed', !open);
      } else {
        panelEl.classList.toggle(openClass, open);
      }
      if (btnEl) btnEl.classList.toggle('active', open);
      if (onToggle) onToggle(open);
    }

    function toggle() {
      setOpen(!isOpen());
    }

    if (btnEl) {
      btnEl.addEventListener('click', toggle);
    }

    return { isOpen, setOpen, toggle };
  }

  // -------- Adjustment (+/−) buttons with hold-to-repeat --------

  /**
   * Enables hold-to-repeat on .adj-btn elements inside a container.
   * Buttons must have data-slider="<input-id>" and data-dir="-1"|"1".
   *
   * @param {HTMLElement} container
   * @param {Object}     [opts]
   * @param {number}     [opts.repeatDelay=150]  ms between repeats
   */
  function setupAdjustmentButtons(container, opts) {
    const delay = (opts && opts.repeatDelay) || 150;
    let interval = null;

    function adjust(btn) {
      const sliderId = btn.dataset.slider;
      const dir = Number(btn.dataset.dir);
      const slider = document.getElementById(sliderId);
      if (!slider) return;

      const step = Number(slider.step) || 1;
      const min  = Number(slider.min);
      const max  = Number(slider.max);
      let val = Number(slider.value) + dir * step;
      val = Math.max(min, Math.min(max, val));

      slider.value = val;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function stop() {
      if (interval) { clearInterval(interval); interval = null; }
    }

    container.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.adj-btn');
      if (!btn) return;
      e.preventDefault();
      stop();
      adjust(btn);
      interval = setInterval(() => adjust(btn), delay);
    });

    container.addEventListener('pointerup', stop);
    container.addEventListener('pointerleave', stop);
    container.addEventListener('pointercancel', stop);

    // Global safety net
    document.addEventListener('pointerup', stop);
  }

  // -------- Public API --------
  return {
    $,
    $$,
    fmt,
    createToggleButton,
    createCollapsiblePanel,
    setupAdjustmentButtons,
  };
})();
