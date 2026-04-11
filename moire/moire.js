(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const fmt = window.NT && window.NT.ui ? window.NT.ui.fmt : (v, d) => String(Number(v).toFixed(typeof d === 'number' ? d : 2));

  const canvas = $('#moireCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const layersHost = $('#layersHost');

  let uid = 1;
  function nextId() {
    return 'g' + uid++;
  }

  /** @type {{ id: string, type: string, color: string, opacity: number, step: number, tiltDeg: number, shiftX: number, shiftY: number }[]} */
  let layers = [
    {
      id: nextId(),
      type: 'square',
      color: '#2ec7ff',
      opacity: 0.44,
      step: 2.1,
      tiltDeg: 117.5,
      shiftX: 4,
      shiftY: 2,
    },
    {
      id: nextId(),
      type: 'square',
      color: '#d946ef',
      opacity: 0.71,
      step: 2.2,
      tiltDeg: -63,
      shiftX: 24,
      shiftY: 0,
    },
  ];

  function hexToRgba(hex, alpha) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function syncLayerFromInputs(layer) {
    const id = layer.id;
    const typeEl = $('#type_' + id);
    const colorEl = $('#color_' + id);
    const opEl = $('#opacity_' + id);
    const stepEl = $('#step_' + id);
    const tiltEl = $('#tilt_' + id);
    const sxEl = $('#shiftX_' + id);
    const syEl = $('#shiftY_' + id);
    if (typeEl) layer.type = typeEl.value;
    if (colorEl) layer.color = colorEl.value;
    if (opEl) layer.opacity = Number(opEl.value);
    if (stepEl) layer.step = Number(stepEl.value);
    if (tiltEl) layer.tiltDeg = Number(tiltEl.value);
    if (sxEl) layer.shiftX = Number(sxEl.value);
    if (syEl) layer.shiftY = Number(syEl.value);
  }

  function sliderRowHtml(id, key, label, min, max, step, value, decimals, unitLabel) {
    const sid = key + '_' + id;
    const vid = 'val_' + key + '_' + id;
    const unit = unitLabel || '';
    return (
      '<div class="ctrl with-adj">' +
      '<label for="' +
      sid +
      '">' +
      label +
      '</label>' +
      '<button type="button" class="adj-btn" data-slider="' +
      sid +
      '" data-dir="-1">−</button>' +
      '<input type="range" id="' +
      sid +
      '" min="' +
      min +
      '" max="' +
      max +
      '" step="' +
      step +
      '" value="' +
      value +
      '" />' +
      '<button type="button" class="adj-btn" data-slider="' +
      sid +
      '" data-dir="1">+</button>' +
      '<div class="small" id="' +
      vid +
      '">' +
      fmt(value, decimals) +
      unit +
      '</div></div>'
    );
  }

  function renderLayerCards() {
    layers.forEach(syncLayerFromInputs);
    layersHost.innerHTML = layers
      .map((layer) => {
        const id = layer.id;
        const t = layer.type;
        return (
          '<div class="layerCard" data-layer-id="' +
          id +
          '">' +
          '<h4>Grid <span class="small" style="font-weight:400;color:#7a8fa6;">#' +
          id +
          '</span>' +
          '<button type="button" class="layer-remove" data-remove="' +
          id +
          '">Remove</button></h4>' +
          '<div class="type-row">' +
          '<label for="type_' +
          id +
          '">Type</label>' +
          '<select id="type_' +
          id +
          '">' +
          '<option value="square"' +
          (t === 'square' ? ' selected' : '') +
          '>Square (90°)</option>' +
          '<option value="hex"' +
          (t === 'hex' ? ' selected' : '') +
          '>Hexagons</option>' +
          '<option value="triangle"' +
          (t === 'triangle' ? ' selected' : '') +
          '>Triangles</option>' +
          '</select></div>' +
          '<div class="color-row">' +
          '<label for="color_' +
          id +
          '">Grid color</label>' +
          '<input type="color" id="color_' +
          id +
          '" value="' +
          layer.color +
          '" /></div>' +
          sliderRowHtml(id, 'opacity', 'Opacity', 0.05, 1, 0.01, layer.opacity, 2, '') +
          sliderRowHtml(id, 'step', 'Grid step', 0, 48, 0.1, layer.step, 2, ' px') +
          sliderRowHtml(id, 'tilt', 'Tilt (deg)', -180, 180, 0.1, layer.tiltDeg, 1, '°') +
          sliderRowHtml(id, 'shiftX', 'Shift X', -200, 200, 1, layer.shiftX, 1, ' px') +
          sliderRowHtml(id, 'shiftY', 'Shift Y', -200, 200, 1, layer.shiftY, 1, ' px') +
          '</div>'
        );
      })
      .join('');

    layersHost.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rid = btn.getAttribute('data-remove');
        if (layers.length <= 1) return;
        layers = layers.filter((l) => l.id !== rid);
        renderLayerCards();
        requestDraw();
      });
    });

    layers.forEach((layer) => {
      const id = layer.id;
      ['type_' + id, 'color_' + id].forEach((sid) => {
        const node = document.getElementById(sid);
        if (node) {
          node.addEventListener('change', () => {
            syncLayerFromInputs(layer);
            requestDraw();
          });
        }
      });
      ['opacity', 'step', 'tilt', 'shiftX', 'shiftY'].forEach((key) => {
        const node = document.getElementById(key + '_' + id);
        if (node) {
          node.addEventListener('input', () => {
            syncLayerFromInputs(layer);
            const vid = document.getElementById('val_' + key + '_' + id);
            if (vid) {
              let u = '';
              if (key === 'step') u = ' px';
              else if (key === 'tilt') u = '°';
              else if (key === 'shiftX' || key === 'shiftY') u = ' px';
              vid.textContent = fmt(Number(node.value), key === 'opacity' ? 2 : key === 'step' ? 2 : 1) + u;
            }
            requestDraw();
          });
        }
      });
    });
  }

  let drawScheduled = false;
  function requestDraw() {
    if (drawScheduled) return;
    drawScheduled = true;
    requestAnimationFrame(() => {
      drawScheduled = false;
      draw();
    });
  }

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(wrap.clientWidth));
    const h = Math.max(1, Math.floor(wrap.clientHeight));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    requestDraw();
  }

  /** Smallest spacing used for drawing (avoids div-by-zero when UI step is 0). */
  const MIN_DRAW_STEP = 1e-4;
  const MAX_LINES_PER_FAMILY = 2800;

  function drawParallelLines(phase, step, R) {
    const s = Math.max(step, MIN_DRAW_STEP);
    const n = Math.min(Math.ceil(R / s) + 2, MAX_LINES_PER_FAMILY);
    for (let k = -n; k <= n; k++) {
      const x = k * s + phase;
      ctx.beginPath();
      ctx.moveTo(x, -R);
      ctx.lineTo(x, R);
      ctx.stroke();
    }
  }

  function drawLayer(layer, cssW, cssH) {
    syncLayerFromInputs(layer);
    const s = Math.max(layer.step, MIN_DRAW_STEP);
    const R = Math.hypot(cssW / 2, cssH / 2) + Math.max(s * 3, 80);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexToRgba(layer.color, layer.opacity);
    ctx.lineCap = 'square';

    const cx = cssW / 2 + layer.shiftX;
    const cy = cssH / 2 + layer.shiftY;
    ctx.translate(cx, cy);
    ctx.rotate((layer.tiltDeg * Math.PI) / 180);

    if (layer.type === 'square') {
      drawParallelLines(0, s, R);
      ctx.rotate(Math.PI / 2);
      drawParallelLines(0, s, R);
    } else {
      const third = Math.PI / 3;
      const triPhase = layer.type === 'triangle' ? s / 2 : 0;
      for (let f = 0; f < 3; f++) {
        ctx.save();
        ctx.rotate(f * third);
        const phase = layer.type === 'triangle' && f === 1 ? triPhase : 0;
        drawParallelLines(phase, s, R);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = $('#bgColor').value;
    ctx.fillRect(0, 0, cssW, cssH);

    layers.forEach((layer) => {
      drawLayer(layer, cssW, cssH);
    });
  }

  const settingsPanel = $('#settingsPanel');
  const settingsBackdrop = $('#settingsBackdrop');
  const settingsBtn = $('#settingsBtn');

  function isSettingsOpen() {
    return !!(settingsPanel && settingsPanel.classList.contains('is-open'));
  }

  function setSettingsOpen(open) {
    if (!settingsPanel || !settingsBtn) return;
    settingsPanel.classList.toggle('is-open', open);
    settingsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    settingsBtn.classList.toggle('active', open);
    settingsBtn.textContent = open ? '⚙ Settings ▼' : '⚙ Settings ▶';
    if (settingsBackdrop) {
      settingsBackdrop.classList.toggle('is-visible', open);
      settingsBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (open) requestAnimationFrame(resizeCanvas);
  }

  function toggleSettings() {
    setSettingsOpen(!isSettingsOpen());
  }

  if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);

  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', () => setSettingsOpen(false));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSettingsOpen()) {
      setSettingsOpen(false);
    }
  });

  $('#bgColor').addEventListener('input', requestDraw);

  $('#addLayerBtn').addEventListener('click', () => {
    layers.push({
      id: nextId(),
      type: 'square',
      color: '#58d68d',
      opacity: 0.35,
      step: Math.round((1 + layers.length * 0.15) * 10) / 10,
      tiltDeg: layers.length * 2,
      shiftX: 0,
      shiftY: 0,
    });
    renderLayerCards();
    requestDraw();
  });

  $('#removeLayerBtn').addEventListener('click', () => {
    if (layers.length <= 1) return;
    layers.pop();
    renderLayerCards();
    requestDraw();
  });

  $('#saveBtn').addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moire-' + Date.now() + '.png';
    a.click();
  });

  window.addEventListener('resize', resizeCanvas);

  if (window.NT && window.NT.ui) {
    window.NT.ui.setupAdjustmentButtons($('#settingsPanel'));
  }

  renderLayerCards();
  resizeCanvas();
})();
