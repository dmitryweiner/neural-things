(function () {
  'use strict';

  const $ = (window.NT && window.NT.ui && window.NT.ui.$) || ((s) => document.querySelector(s));
  const fmt = (window.NT && window.NT.ui && window.NT.ui.fmt) || ((v, d) => String(Number(v).toFixed(typeof d === 'number' ? d : 2)));

  const canvas = $('#girihCanvas');
  const ctx = canvas.getContext('2d');
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');

  // ---------- state ----------
  const state = {
    N: 8,
    mirror: false,
    tool: 'polyline',           // 'polyline' | 'freehand'
    stroke: { color: '#e8c36a', width: 2 },
    bg: '#0a0c10',
    snap: { radial: true, ring: true, divisions: 4, rings: 6 },
    showGuides: true,
    highlightWedge: true,
    tile: 'off',                // 'off' | 'square' | 'hex'
    tileScale: 0.5,
    strokes: [],                // { points:[{x,y}], color, width }
    pending: null,              // { points:[{x,y}], hover:{x,y}|null }
    freehand: null,             // current freehand stroke being recorded
    history: [],
    future: [],
  };

  const HISTORY_CAP = 100;

  function snapshotBefore() {
    state.history.push(JSON.stringify(state.strokes));
    if (state.history.length > HISTORY_CAP) state.history.shift();
    state.future.length = 0;
  }
  function undo() {
    if (!state.history.length) return;
    state.future.push(JSON.stringify(state.strokes));
    state.strokes = JSON.parse(state.history.pop());
    cancelPending();
    requestDraw();
  }
  function redo() {
    if (!state.future.length) return;
    state.history.push(JSON.stringify(state.strokes));
    state.strokes = JSON.parse(state.future.pop());
    cancelPending();
    requestDraw();
  }

  // ---------- geometry ----------
  function sectorStep() { return (2 * Math.PI) / state.N; }
  function fundAngle() { return state.mirror ? Math.PI / state.N : (2 * Math.PI) / state.N; }

  function computeR() {
    const rect = canvas.getBoundingClientRect();
    return Math.max(10, Math.min(rect.width, rect.height) / 2 - 20);
  }

  function canvasCenterLocal(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }

  /** Fold a center-relative point into the fundamental wedge. */
  function foldToWedge(x, y) {
    const r = Math.hypot(x, y);
    if (r < 1e-6) return { x: 0, y: 0 };
    const step = sectorStep();
    let theta = Math.atan2(y, x);
    theta = ((theta % step) + step) % step;
    if (state.mirror && theta > step / 2) theta = step - theta;
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
  }

  /** Snap a wedge-local point to radial/ring grid. Shift key disables. */
  function snapWedgePoint(wx, wy, disableSnap) {
    const r = Math.hypot(wx, wy);
    if (r < 1e-6) return { x: 0, y: 0 };
    let theta = Math.atan2(wy, wx);
    let radius = r;
    if (!disableSnap && state.snap.radial) {
      const fund = fundAngle();
      const step = fund / Math.max(1, state.snap.divisions);
      theta = Math.round(theta / step) * step;
      if (theta < 0) theta = 0;
      if (theta > fund) theta = fund;
    }
    if (!disableSnap && state.snap.ring) {
      const R = computeR();
      const step = R / Math.max(1, state.snap.rings);
      radius = Math.round(r / step) * step;
      if (radius < 0) radius = 0;
    }
    return { x: radius * Math.cos(theta), y: radius * Math.sin(theta) };
  }

  // ---------- rendering ----------
  function drawStrokeSet(targetCtx, strokes, pending) {
    const step = sectorStep();
    for (let k = 0; k < state.N; k++) {
      targetCtx.save();
      targetCtx.rotate(k * step);
      renderStrokeList(targetCtx, strokes, pending, false);
      targetCtx.restore();
      if (state.mirror) {
        targetCtx.save();
        targetCtx.rotate(k * step);
        targetCtx.scale(1, -1);
        renderStrokeList(targetCtx, strokes, pending, true);
        targetCtx.restore();
      }
    }
  }

  function renderStrokeList(targetCtx, strokes, pending, isMirror) {
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    for (let i = 0; i < strokes.length; i++) {
      const s = strokes[i];
      if (s.points.length < 1) continue;
      targetCtx.strokeStyle = s.color;
      targetCtx.lineWidth = s.width;
      targetCtx.beginPath();
      for (let j = 0; j < s.points.length; j++) {
        const p = s.points[j];
        if (j === 0) targetCtx.moveTo(p.x, p.y);
        else targetCtx.lineTo(p.x, p.y);
      }
      targetCtx.stroke();
      if (s.points.length === 1) {
        targetCtx.fillStyle = s.color;
        targetCtx.beginPath();
        targetCtx.arc(s.points[0].x, s.points[0].y, s.width * 0.6, 0, Math.PI * 2);
        targetCtx.fill();
      }
    }
    if (pending && pending.points.length > 0) {
      targetCtx.strokeStyle = state.stroke.color;
      targetCtx.lineWidth = state.stroke.width;
      targetCtx.beginPath();
      pending.points.forEach((p, j) => {
        if (j === 0) targetCtx.moveTo(p.x, p.y);
        else targetCtx.lineTo(p.x, p.y);
      });
      if (pending.hover) {
        const last = pending.points[pending.points.length - 1];
        targetCtx.moveTo(last.x, last.y);
        targetCtx.lineTo(pending.hover.x, pending.hover.y);
      }
      targetCtx.stroke();
      targetCtx.fillStyle = state.stroke.color;
      pending.points.forEach((p) => {
        targetCtx.beginPath();
        targetCtx.arc(p.x, p.y, Math.max(2.5, state.stroke.width * 0.9), 0, Math.PI * 2);
        targetCtx.fill();
      });
    }
  }

  function drawGuides(targetCtx, R) {
    const fund = fundAngle();
    targetCtx.save();
    targetCtx.lineWidth = 1;

    // highlight wedge fill
    if (state.highlightWedge) {
      targetCtx.fillStyle = 'rgba(80, 140, 220, 0.09)';
      targetCtx.beginPath();
      targetCtx.moveTo(0, 0);
      targetCtx.lineTo(R * Math.cos(0), R * Math.sin(0));
      targetCtx.arc(0, 0, R, 0, fund);
      targetCtx.closePath();
      targetCtx.fill();
    }

    // full circle at R (faint)
    targetCtx.strokeStyle = 'rgba(140, 170, 210, 0.22)';
    targetCtx.beginPath();
    targetCtx.arc(0, 0, R, 0, Math.PI * 2);
    targetCtx.stroke();

    // all N sector boundaries (faint)
    const step = sectorStep();
    targetCtx.strokeStyle = 'rgba(140, 170, 210, 0.12)';
    for (let k = 0; k < state.N; k++) {
      const a = k * step;
      targetCtx.beginPath();
      targetCtx.moveTo(0, 0);
      targetCtx.lineTo(R * Math.cos(a), R * Math.sin(a));
      targetCtx.stroke();
    }
    if (state.mirror) {
      for (let k = 0; k < state.N; k++) {
        const a = k * step + step / 2;
        targetCtx.beginPath();
        targetCtx.moveTo(0, 0);
        targetCtx.lineTo(R * Math.cos(a), R * Math.sin(a));
        targetCtx.stroke();
      }
    }

    // wedge boundaries (brighter)
    targetCtx.strokeStyle = 'rgba(180, 210, 250, 0.55)';
    targetCtx.lineWidth = 1.2;
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.lineTo(R, 0);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.lineTo(R * Math.cos(fund), R * Math.sin(fund));
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.arc(0, 0, R, 0, fund);
    targetCtx.stroke();

    // snap subdivisions inside wedge
    if (state.snap.radial) {
      targetCtx.strokeStyle = 'rgba(180, 210, 250, 0.18)';
      targetCtx.lineWidth = 1;
      const divs = Math.max(1, state.snap.divisions);
      for (let i = 1; i < divs; i++) {
        const a = (fund * i) / divs;
        targetCtx.beginPath();
        targetCtx.moveTo(0, 0);
        targetCtx.lineTo(R * Math.cos(a), R * Math.sin(a));
        targetCtx.stroke();
      }
    }
    if (state.snap.ring) {
      targetCtx.strokeStyle = 'rgba(180, 210, 250, 0.18)';
      targetCtx.lineWidth = 1;
      const rings = Math.max(1, state.snap.rings);
      for (let i = 1; i < rings; i++) {
        const r = (R * i) / rings;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, r, 0, fund);
        targetCtx.stroke();
      }
    }

    targetCtx.restore();
  }

  function renderRosetteTo(targetCtx, R) {
    targetCtx.save();
    drawStrokeSet(targetCtx, state.strokes, state.pending);
    if (state.freehand && state.freehand.points.length > 0) {
      drawStrokeSet(targetCtx, [state.freehand], null);
    }
    targetCtx.restore();
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
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    requestDraw();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const R = computeR();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = state.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    if (state.tile === 'off') {
      ctx.save();
      ctx.translate(cssW / 2, cssH / 2);
      renderRosetteTo(ctx, R);
      if (state.showGuides) drawGuides(ctx, R);
      ctx.restore();
      return;
    }

    // render rosette to offscreen tile
    const tilePadding = 4;
    const tileSize = Math.ceil((R + tilePadding) * 2);
    offscreen.width = tileSize;
    offscreen.height = tileSize;
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.clearRect(0, 0, tileSize, tileSize);
    offCtx.save();
    offCtx.translate(tileSize / 2, tileSize / 2);
    renderRosetteTo(offCtx, R);
    offCtx.restore();

    const cellCss = tileSize * state.tileScale;
    const hexRow = state.tile === 'hex';
    const rowStep = hexRow ? cellCss * 0.866 : cellCss;
    const cols = Math.ceil(cssW / cellCss) + 2;
    const rows = Math.ceil(cssH / rowStep) + 2;
    const originX = cssW / 2 - (cols / 2) * cellCss;
    const originY = cssH / 2 - (rows / 2) * rowStep;
    for (let r = 0; r < rows; r++) {
      const xShift = hexRow && (r & 1) ? cellCss / 2 : 0;
      for (let c = 0; c < cols; c++) {
        const x = originX + c * cellCss + xShift;
        const y = originY + r * rowStep;
        ctx.drawImage(offscreen, x, y, cellCss, cellCss);
      }
    }
  }

  // ---------- input: folding with locked initial sector ----------
  let activeSector = null;  // { k: number, mirror: boolean }

  function lockSectorFrom(gx, gy) {
    const step = sectorStep();
    let theta = Math.atan2(gy, gx);
    theta = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.floor(theta / step) % state.N;
    let local = theta - k * step;  // [0, step)
    let mirror = false;
    if (state.mirror && local > step / 2) mirror = true;
    activeSector = { k, mirror };
  }

  function unrotateToWedge(gx, gy) {
    // If activeSector set, apply its inverse. Otherwise fold generically.
    if (!activeSector) return foldToWedge(gx, gy);
    const step = sectorStep();
    const cosA = Math.cos(-activeSector.k * step);
    const sinA = Math.sin(-activeSector.k * step);
    let x = gx * cosA - gy * sinA;
    let y = gx * sinA + gy * cosA;
    if (activeSector.mirror) y = -y;
    // clamp to fundamental wedge so the recorded stroke never leaves it
    const fund = fundAngle();
    const r = Math.hypot(x, y);
    if (r < 1e-6) return { x: 0, y: 0 };
    let theta = Math.atan2(y, x);
    // for cyclic (no mirror), fund = step; theta can be anywhere, fold modulo step
    if (!state.mirror) {
      theta = ((theta % step) + step) % step;
    } else {
      // for dihedral after un-reflect we expect theta in roughly [0, step/2];
      // reduce defensively:
      theta = ((theta % step) + step) % step;
      if (theta > step / 2) theta = step - theta;
    }
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
  }

  // ---------- pointer handlers ----------
  let drawingFreehand = false;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    const loc = canvasCenterLocal(e.clientX, e.clientY);
    lockSectorFrom(loc.x, loc.y);
    const w = unrotateToWedge(loc.x, loc.y);
    if (state.tool === 'freehand') {
      drawingFreehand = true;
      state.freehand = {
        points: [w],
        color: state.stroke.color,
        width: state.stroke.width,
      };
      requestDraw();
    } else {
      // polyline
      const snapped = snapWedgePoint(w.x, w.y, e.shiftKey);
      if (!state.pending) {
        state.pending = { points: [snapped], hover: null };
      } else {
        state.pending.points.push(snapped);
      }
      requestDraw();
    }
  }

  function onPointerMove(e) {
    const loc = canvasCenterLocal(e.clientX, e.clientY);
    if (state.tool === 'freehand' && drawingFreehand) {
      const w = unrotateToWedge(loc.x, loc.y);
      const pts = state.freehand.points;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(w.x - last.x, w.y - last.y) > 1.5) {
        pts.push(w);
        requestDraw();
      }
    } else if (state.tool === 'polyline' && state.pending) {
      // lock sector on first move if not locked yet
      if (!activeSector) lockSectorFrom(loc.x, loc.y);
      const w = unrotateToWedge(loc.x, loc.y);
      state.pending.hover = snapWedgePoint(w.x, w.y, e.shiftKey);
      requestDraw();
    }
  }

  function onPointerUp(e) {
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (state.tool === 'freehand' && drawingFreehand) {
      drawingFreehand = false;
      const fh = state.freehand;
      state.freehand = null;
      if (fh && fh.points.length > 0) {
        snapshotBefore();
        state.strokes.push(fh);
      }
      activeSector = null;
      requestDraw();
    }
  }

  function commitPending() {
    if (!state.pending) return;
    const pts = state.pending.points.slice();
    state.pending = null;
    activeSector = null;
    if (pts.length >= 1) {
      snapshotBefore();
      state.strokes.push({
        points: pts,
        color: state.stroke.color,
        width: state.stroke.width,
      });
    }
    requestDraw();
  }

  function cancelPending() {
    state.pending = null;
    state.freehand = null;
    drawingFreehand = false;
    activeSector = null;
    requestDraw();
  }

  function onDblClick() {
    if (state.tool === 'polyline' && state.pending) commitPending();
  }

  // ---------- UI bindings ----------
  function bindSymmetryButtons() {
    const host = $('#symmetryBtns');
    host.querySelectorAll('button[data-n]').forEach((btn) => {
      const n = Number(btn.getAttribute('data-n'));
      if (n === state.N) btn.classList.add('active');
      btn.addEventListener('click', () => {
        state.N = n;
        host.querySelectorAll('button[data-n]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        cancelPending();
        requestDraw();
      });
    });
  }

  function bindTileButtons() {
    const host = $('#tileBtns');
    host.querySelectorAll('button[data-tile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tile = btn.getAttribute('data-tile');
        host.querySelectorAll('button[data-tile]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        requestDraw();
      });
    });
  }

  function setTool(tool) {
    if (state.pending) commitPending();
    state.tool = tool;
    $('#toolFreehandBtn').classList.toggle('active', tool === 'freehand');
    $('#toolPolylineBtn').classList.toggle('active', tool === 'polyline');
    const hint = $('#statusHint');
    if (hint) {
      hint.textContent = tool === 'freehand'
        ? 'Freehand — drag in any sector; the motif is mirrored around the center.'
        : 'Polyline — click to place vertices. Enter/double-click to finish.';
    }
  }

  // ---------- export ----------
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPNG() {
    const R = computeR();
    const targetR = Math.max(R, 900);
    const pad = 40;
    const size = Math.ceil((targetR + pad) * 2);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ectx = exportCanvas.getContext('2d');
    ectx.fillStyle = state.bg;
    ectx.fillRect(0, 0, size, size);
    ectx.save();
    ectx.translate(size / 2, size / 2);
    const scale = targetR / R;
    ectx.scale(scale, scale);
    // reuse rendering without guides
    drawStrokeSet(ectx, state.strokes, null);
    ectx.restore();
    exportCanvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'girih-' + Date.now() + '.png');
    }, 'image/png');
  }

  function exportSVG() {
    const R = computeR();
    const pad = 40;
    const size = Math.ceil((R + pad) * 2);
    const half = size / 2;
    const step = sectorStep();

    const pathD = (points) => {
      let d = '';
      for (let i = 0; i < points.length; i++) {
        d += (i === 0 ? 'M' : ' L') + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
      }
      return d;
    };
    const strokesXml = state.strokes
      .filter((s) => s.points.length > 0)
      .map((s) => {
        if (s.points.length === 1) {
          const p = s.points[0];
          return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(s.width * 0.6).toFixed(2)}" fill="${s.color}"/>`;
        }
        return `<path d="${pathD(s.points)}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join('');

    let groups = '';
    for (let k = 0; k < state.N; k++) {
      const deg = ((k * step * 180) / Math.PI).toFixed(4);
      groups += `<g transform="rotate(${deg})">${strokesXml}</g>`;
      if (state.mirror) {
        groups += `<g transform="rotate(${deg}) scale(1,-1)">${strokesXml}</g>`;
      }
    }

    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-half} ${-half} ${size} ${size}">` +
      `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" fill="${state.bg}"/>` +
      `<g>${groups}</g>` +
      `</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, 'girih-' + Date.now() + '.svg');
  }

  // ---------- wire up ----------
  function wireInputs() {
    $('#mirrorChk').addEventListener('change', (e) => {
      state.mirror = e.target.checked;
      cancelPending();
      requestDraw();
    });
    $('#showGuidesChk').addEventListener('change', (e) => {
      state.showGuides = e.target.checked;
      requestDraw();
    });
    $('#highlightWedgeChk').addEventListener('change', (e) => {
      state.highlightWedge = e.target.checked;
      requestDraw();
    });
    $('#snapRadialChk').addEventListener('change', (e) => {
      state.snap.radial = e.target.checked;
      requestDraw();
    });
    $('#snapRingChk').addEventListener('change', (e) => {
      state.snap.ring = e.target.checked;
      requestDraw();
    });
    $('#strokeColor').addEventListener('input', (e) => {
      state.stroke.color = e.target.value;
      requestDraw();
    });
    $('#bgColor').addEventListener('input', (e) => {
      state.bg = e.target.value;
      requestDraw();
    });

    const sliderBinds = [
      { id: 'strokeWidth', get: (v) => (state.stroke.width = Number(v)), fmtDigits: 1, unit: ' px' },
      { id: 'divisions', get: (v) => (state.snap.divisions = Number(v)), fmtDigits: 0, unit: '' },
      { id: 'rings', get: (v) => (state.snap.rings = Number(v)), fmtDigits: 0, unit: '' },
      { id: 'tileScale', get: (v) => (state.tileScale = Number(v)), fmtDigits: 2, unit: '' },
    ];
    sliderBinds.forEach((b) => {
      const el = $('#' + b.id);
      const lbl = $('#val_' + b.id);
      const update = () => {
        b.get(el.value);
        if (lbl) lbl.textContent = fmt(Number(el.value), b.fmtDigits) + b.unit;
        requestDraw();
      };
      el.addEventListener('input', update);
      update();
    });

    $('#toolFreehandBtn').addEventListener('click', () => setTool('freehand'));
    $('#toolPolylineBtn').addEventListener('click', () => setTool('polyline'));
    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);
    $('#clearBtn').addEventListener('click', () => {
      if (!state.strokes.length && !state.pending) return;
      snapshotBefore();
      state.strokes = [];
      cancelPending();
      requestDraw();
    });
    $('#savePngBtn').addEventListener('click', exportPNG);
    $('#saveSvgBtn').addEventListener('click', exportSVG);

    bindSymmetryButtons();
    bindTileButtons();

    if (window.NT && window.NT.ui) {
      window.NT.ui.setupAdjustmentButtons($('#settingsPanel'));
    }
  }

  // ---------- settings drawer ----------
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
    else requestAnimationFrame(resizeCanvas);
  }
  if (settingsBtn) settingsBtn.addEventListener('click', () => setSettingsOpen(!isSettingsOpen()));
  if (settingsBackdrop) settingsBackdrop.addEventListener('click', () => setSettingsOpen(false));

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    const isTextField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (isTextField && e.target.type !== 'range' && e.target.type !== 'color' && e.target.type !== 'checkbox') return;

    if (e.key === 'Escape') {
      if (state.pending || state.freehand) {
        cancelPending();
      } else if (isSettingsOpen()) {
        setSettingsOpen(false);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (state.pending) {
        e.preventDefault();
        commitPending();
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      setTool('freehand');
    } else if (e.key === 'p' || e.key === 'P') {
      setTool('polyline');
    }
  });

  // ---------- canvas pointer ----------
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('contextmenu', (e) => {
    if (state.pending) { e.preventDefault(); commitPending(); }
  });

  window.addEventListener('resize', resizeCanvas);

  // ---------- init ----------
  wireInputs();
  setTool(state.tool);
  resizeCanvas();
  requestDraw();
})();
