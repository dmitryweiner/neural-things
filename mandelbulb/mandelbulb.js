(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const CLEAR_COLOR = 0x060a0f;
  const LIGHT_KEY = 0xdfefff;
  const LIGHT_FILL = 0x8eb4d4;
  const ICE_BASE = 0xa8c8e8;

  const WORKER_SCRIPT = 'mandelbulb-worker.js';

  const FORMULA_NAMES = {
    mandelbulb: 'Mandelbulb',
    mandelbox: 'Mandelbox',
    menger: 'Menger sponge',
  };

  let lastStlFormula = 'mandelbulb';

  function syncFormulaLabels() {
    const f = $('formula') ? $('formula').value : 'mandelbulb';
    const labPow = $('labPow');
    const labIter = $('labIter');
    const labBail = $('labBail');
    if (!labPow || !labIter || !labBail) return;
    const map = {
      mandelbulb: { p: 'Power', i: 'Iterations', b: 'Bailout radius' },
      mandelbox: { p: 'Scale (via power)', i: 'Iterations', b: 'Escape (boosted for box)' },
      menger: { p: 'Sponge depth (power)', i: 'Iterations (unused)', b: 'Bailout (unused)' },
    };
    const L = map[f] || map.mandelbulb;
    labPow.textContent = L.p;
    labIter.textContent = L.i;
    labBail.textContent = L.b;
  }

  const formulaEl = $('formula');
  if (formulaEl) {
    formulaEl.addEventListener('change', syncFormulaLabels);
    syncFormulaLabels();
  }

  /** Voxel grid is N³ bytes (Int8); cap slider and RAM budget. */
  const MIN_GRID = 32;
  const MAX_SLIDER = 400;
  const DEFAULT_VOXEL_BUDGET_BYTES = 300 * 1024 * 1024;

  function maxGridNForMemory() {
    let budget = DEFAULT_VOXEL_BUDGET_BYTES;
    try {
      if (typeof performance !== 'undefined' && performance.memory && performance.memory.jsHeapSizeLimit) {
        const lim = performance.memory.jsHeapSizeLimit;
        budget = Math.min(380 * 1024 * 1024, Math.max(budget, lim * 0.1));
      }
    } catch (e) {
      /* ignore */
    }
    const n = Math.floor(Math.pow(budget, 1 / 3));
    return Math.max(MIN_GRID, Math.min(MAX_SLIDER, n));
  }

  let computeWorker = null;

  function killWorker() {
    if (computeWorker) {
      computeWorker.terminate();
      computeWorker = null;
    }
  }

  function setProgress(visible, t, phase) {
    const wrap = $('progressWrap');
    const fill = $('progressFill');
    const ph = $('progressPhase');
    const pct = $('progressPct');
    if (!wrap || !fill || !ph || !pct) return;
    if (!visible) {
      wrap.hidden = true;
      fill.style.width = '0%';
      ph.textContent = '';
      pct.textContent = '';
      return;
    }
    wrap.hidden = false;
    const p = Math.round(Math.min(1, Math.max(0, t)) * 100);
    fill.style.width = p + '%';
    ph.textContent = phase || '';
    pct.textContent = p + '%';
  }

  const sliders = [
    ['sPow', 'vPow'],
    ['sIter', 'vIter'],
    ['sRes', 'vRes'],
    ['sBail', 'vBail'],
  ];
  sliders.forEach(([sid, vid]) => {
    const s = $(sid);
    const v = $(vid);
    s.addEventListener('input', () => {
      v.textContent = s.value;
    });
  });

  const canvas = $('c3d');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(CLEAR_COLOR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 2, 0.01, 100);
  camera.position.set(0, 0, 3.5);

  scene.add(new THREE.AmbientLight(0x6b8cae, 0.35));
  const hemi = new THREE.HemisphereLight(0x8aa8bc, 0x1b263b, 0.45);
  scene.add(hemi);
  const d1 = new THREE.DirectionalLight(LIGHT_KEY, 0.72);
  d1.position.set(2.8, 4.2, 3.2);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(LIGHT_FILL, 0.28);
  d2.position.set(-3.5, -1.2, 2.4);
  scene.add(d2);

  let meshObj = null;

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: ICE_BASE,
    roughness: 0.52,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  function exportSTL(geom) {
    const pos = geom.attributes.position;
    const nor = geom.attributes.normal;
    const triCount = pos.count / 3;
    const buf = new ArrayBuffer(84 + triCount * 50);
    const dv = new DataView(buf);
    const enc = new TextEncoder();
    enc.encodeInto('Voxel STL export'.padEnd(80), new Uint8Array(buf, 0, 80));
    dv.setUint32(80, triCount, true);
    let off = 84;
    for (let i = 0; i < triCount; i++) {
      const ni = i * 3;
      dv.setFloat32(off, nor.getX(ni), true);
      off += 4;
      dv.setFloat32(off, nor.getY(ni), true);
      off += 4;
      dv.setFloat32(off, nor.getZ(ni), true);
      off += 4;
      for (let j = 0; j < 3; j++) {
        const vi = i * 3 + j;
        dv.setFloat32(off, pos.getX(vi) * 100, true);
        off += 4;
        dv.setFloat32(off, pos.getY(vi) * 100, true);
        off += 4;
        dv.setFloat32(off, pos.getZ(vi) * 100, true);
        off += 4;
      }
      dv.setUint16(off, 0, true);
      off += 2;
    }
    const blob = new Blob([buf], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      lastStlFormula +
      '_p' +
      $('sPow').value +
      '_i' +
      $('sIter').value +
      '.stl';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  $('btnSTL').addEventListener('click', () => {
    if (meshObj && meshObj.geometry) exportSTL(meshObj.geometry);
  });

  function disposeMesh() {
    if (!meshObj) return;
    scene.remove(meshObj);
    if (meshObj.geometry) meshObj.geometry.dispose();
    meshObj = null;
  }

  $('btnRender').addEventListener('click', () => {
    const requestedRes = Math.max(
      MIN_GRID,
      Math.min(MAX_SLIDER, parseInt($('sRes').value, 10) || MIN_GRID)
    );
    const memCapN = maxGridNForMemory();
    const res = Math.min(requestedRes, memCapN);
    const iter = parseInt($('sIter').value, 10);
    const power = parseFloat($('sPow').value);
    const bail = parseFloat($('sBail').value);
    const allowedF = { mandelbulb: 1, mandelbox: 1, menger: 1 };
    const rawF = formulaEl && formulaEl.value ? formulaEl.value : 'mandelbulb';
    const formula = allowedF[rawF] ? rawF : 'mandelbulb';

    const gridNote =
      res < requestedRes
        ? '\nGrid reduced from ' +
          requestedRes +
          ' to ' +
          res +
          ' (~' +
          Math.round((res * res * res) / 1024 / 1024) +
          ' MB voxels; browser memory limit).'
        : '';

    killWorker();
    disposeMesh();

    $('btnRender').disabled = true;
    $('btnSTL').disabled = true;
    $('statusBox').textContent =
      res > 360
        ? 'Computing in background… (large grids can take several minutes)'
        : 'Computing in background…';

    setProgress(true, 0, 'Starting worker…');

    let w;
    try {
      w = new Worker(WORKER_SCRIPT);
    } catch (err) {
      setProgress(false);
      $('statusBox').textContent =
        'Could not start worker (try opening the page over http(s), not file://). ' +
        (err && err.message ? err.message : '');
      $('btnRender').disabled = false;
      return;
    }

    computeWorker = w;

    w.onmessage = function (ev) {
      const m = ev.data;
      if (!m || typeof m !== 'object') return;

      if (m.type === 'progress') {
        setProgress(true, m.t, m.phase);
        return;
      }

      if (m.type === 'fail') {
        killWorker();
        setProgress(false);
        disposeMesh();
        if (m.fail === 'empty') {
          $('statusBox').textContent = 'No solid found. Try different parameters.';
        } else if (m.fail === 'no_boundary') {
          $('statusBox').textContent = 'No boundary found. Try different parameters.';
        } else {
          $('statusBox').textContent = 'Error: ' + (m.message || m.fail || 'unknown');
        }
        $('btnRender').disabled = false;
        return;
      }

      if (m.type === 'done') {
        killWorker();
        setProgress(true, 1, 'Preparing mesh…');

        const buf = m.positionBuffer;
        if (!buf || !m.floatCount) {
          setProgress(false);
          $('statusBox').textContent = 'Invalid worker result.';
          $('btnRender').disabled = false;
          return;
        }

        const fa = new Float32Array(buf, 0, m.floatCount);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(fa, 3));
        geom.computeVertexNormals();

        meshObj = new THREE.Mesh(geom, shellMaterial);
        scene.add(meshObj);

        const triCount = geom.attributes.position.count / 3;
        const elapsed = (m.elapsedMs / 1000).toFixed(1);
        const resUsed = m.res != null ? m.res : res;

        setProgress(false);

        let islandLine = '';
        if (m.islandsRemoved > 0) {
          islandLine =
            '\nRemoved ' +
            m.islandsRemoved.toLocaleString() +
            ' disconnected inside voxels (largest 6-connected shell kept for print).';
        }
        if (m.islandCullSkipped) {
          islandLine +=
            '\nStray-voxel filter skipped (BFS size limit). Try a slightly smaller grid if specks remain.';
        }

        lastStlFormula = m.formula && FORMULA_NAMES[m.formula] ? m.formula : 'mandelbulb';

        const fname = FORMULA_NAMES[lastStlFormula] || lastStlFormula;
        $('statusBox').textContent =
          fname +
          ' · done in ' +
          elapsed +
          's · grid ' +
          resUsed +
          '³' +
          gridNote +
          islandLine +
          '\n' +
          triCount.toLocaleString() +
          ' triangles (shell)';

        $('btnRender').disabled = false;
        $('btnSTL').disabled = false;
      }
    };

    w.onerror = function (err) {
      killWorker();
      setProgress(false);
      disposeMesh();
      $('statusBox').textContent = 'Worker error: ' + (err && err.message ? err.message : 'unknown');
      $('btnRender').disabled = false;
    };

    w.postMessage({
      type: 'run',
      res: res,
      requestedRes: requestedRes,
      iter: iter,
      power: power,
      bail: bail,
      formula: formula,
    });
  });

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let rotX = 0;
  let rotY = 0;
  let dist = 3.5;
  let autoSpin = true;

  const btnSpin = $('btnSpin');
  function syncSpinButton() {
    if (!btnSpin) return;
    btnSpin.textContent = autoSpin ? 'Auto spin: On' : 'Auto spin: Off';
    btnSpin.classList.toggle('is-off', !autoSpin);
    btnSpin.setAttribute('aria-pressed', autoSpin ? 'true' : 'false');
  }
  if (btnSpin) {
    btnSpin.addEventListener('click', () => {
      autoSpin = !autoSpin;
      syncSpinButton();
    });
    syncSpinButton();
  }

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      dist = Math.max(1.2, Math.min(8, dist + e.deltaY * 0.003));
      e.preventDefault();
    },
    { passive: false }
  );

  let touchStart = null;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      touchStart = e.touches[0];
    },
    { passive: true }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!touchStart) return;
      rotY += (e.touches[0].clientX - touchStart.clientX) * 0.01;
      rotX += (e.touches[0].clientY - touchStart.clientY) * 0.01;
      touchStart = e.touches[0];
    },
    { passive: true }
  );

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    resize();
    if (autoSpin && !isDragging && meshObj) rotY += 0.003;
    camera.position.x = dist * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = dist * Math.sin(rotX);
    camera.position.z = dist * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  animate();

  $('btnRender').click();
})();
