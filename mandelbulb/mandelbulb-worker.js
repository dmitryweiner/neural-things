/* global self */
(function () {
  'use strict';

  const PROGRESS_INTERVAL_MS = 80;

  let lastProgressAt = 0;

  function emitProgress(t, phase) {
    const now = self.performance.now();
    if (t < 1 && now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    self.postMessage({ type: 'progress', t: Math.min(1, Math.max(0, t)), phase: phase });
  }

  /** Mandelbulb with optional polar angle (deg): rotate sample + c offset around X before iterating. */
  function mandelbulb(x, y, z, maxIter, power, bailout, polarDeg) {
    const a = ((polarDeg != null && Number.isFinite(polarDeg) ? polarDeg : 0) * Math.PI) / 180;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const rx = x;
    const ry = y * cosA - z * sinA;
    const rz = y * sinA + z * cosA;
    let cx = rx;
    let cy = ry;
    let cz = rz;
    let dr = 1;
    let r = 0;
    for (let i = 0; i < maxIter; i++) {
      r = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (r > bailout) return { escaped: true, iter: i, r: r };
      const theta = Math.acos(Math.max(-1, Math.min(1, cz / r)));
      const phi = Math.atan2(cy, cx);
      const zr = Math.pow(r, power);
      dr = Math.pow(r, power - 1) * power * dr + 1;
      const st = Math.sin(theta * power);
      cx = zr * st * Math.cos(phi * power) + rx;
      cy = zr * st * Math.sin(phi * power) + ry;
      cz = zr * Math.cos(theta * power) + rz;
    }
    return { escaped: false, iter: maxIter, r: r };
  }

  function sdfMandelbulb(x, y, z, maxIter, power, bailout, polarDeg) {
    const { escaped } = mandelbulb(x, y, z, maxIter, power, bailout, polarDeg);
    return escaped ? 1 : -1;
  }

  /** Mandelbox: folds + scale; tends to thicker walls than Mandelbulb — good for FDM. */
  function sdfMandelbox(x, y, z, maxIter, power, bailout) {
    let zx = x;
    let zy = y;
    let zz = z;
    const cx = x;
    const cy = y;
    const cz = z;
    let scale = -2.0 + (power - 8) * 0.04;
    if (scale < -2.55) scale = -2.55;
    if (scale > -1.55) scale = -1.55;
    /* Bailout from the UI is tuned for Mandelbulb (~2–6). Mandelbox orbits need a much
       larger sphere test or almost everything is misclassified as escaped → one voxel. */
    const escapeR = Math.max(12, bailout * 6);
    for (let i = 0; i < maxIter; i++) {
      zx = zx > 1 ? 2 - zx : zx < -1 ? -2 - zx : zx;
      zy = zy > 1 ? 2 - zy : zy < -1 ? -2 - zy : zy;
      zz = zz > 1 ? 2 - zz : zz < -1 ? -2 - zz : zz;
      let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
      if (r < 0.5) {
        zx *= 4;
        zy *= 4;
        zz *= 4;
      } else if (r < 1) {
        const t = 1 / (r * r);
        zx *= t;
        zy *= t;
        zz *= t;
      }
      zx = scale * zx + cx;
      zy = scale * zy + cy;
      zz = scale * zz + cz;
      r = Math.sqrt(zx * zx + zy * zy + zz * zz);
      if (r > escapeR) return 1;
    }
    return -1;
  }

  /**
   * Classic Menger sponge in the axis-aligned cube (same bounds as the voxel grid).
   * 3×3×3 subdivision each level: remove the 7 sub-cubes that share two or three middle slices
   * (body centre + 6 face centres). Not the same as the "sort + 3z−2" IFS (that gives other shapes).
   */
  function sdfMenger(x, y, z, power, gridN) {
    const range = 1.3;
    const desired = Math.max(1, Math.min(7, Math.round(power / 2)));
    const byGrid = Math.max(1, Math.floor(Math.log(Math.max(24, gridN) * 0.45) / Math.log(3)));
    const depth = Math.min(desired, byGrid);

    let ux = (x + range) / (2 * range);
    let uy = (y + range) / (2 * range);
    let uz = (z + range) / (2 * range);

    if (ux < 0 || ux > 1 || uy < 0 || uy > 1 || uz < 0 || uz > 1) return 1;

    for (let d = 0; d < depth; d++) {
      const ix = Math.min(2, Math.floor(ux * 3));
      const iy = Math.min(2, Math.floor(uy * 3));
      const iz = Math.min(2, Math.floor(uz * 3));
      if ((ix === 1 && iy === 1) || (iy === 1 && iz === 1) || (ix === 1 && iz === 1)) {
        return 1;
      }
      ux = ux * 3 - ix;
      uy = uy * 3 - iy;
      uz = uz * 3 - iz;
    }
    return -1;
  }

  function sdf(x, y, z, maxIter, power, bailout, formula, gridN, polarDeg) {
    switch (formula) {
      case 'mandelbox':
        return sdfMandelbox(x, y, z, maxIter, power, bailout);
      case 'menger':
        return sdfMenger(x, y, z, power, gridN);
      default:
        return sdfMandelbulb(x, y, z, maxIter, power, bailout, polarDeg);
    }
  }

  function fillVolume(N, maxIter, power, bailout, formula, onSlice, polarDeg) {
    const range = 1.3;
    const step = (2 * range) / (N - 1);
    const vol = new Int8Array(N * N * N);
    let inside = 0;
    /* Sphere skip is only for bulb-like sets; it inscribes a ball in the voxel cube and would
       clip corners → Mandelbox / Menger look wrongly round instead of square/cubic. */
    const sphereSkip = formula === 'mandelbulb';
    const rMax2 = range * range * 1.1;
    for (let iz = 0; iz < N; iz++) {
      for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
          const x = -range + ix * step;
          const y = -range + iy * step;
          const z = -range + iz * step;
          const r2 = x * x + y * y + z * z;
          if (sphereSkip && r2 > rMax2) {
            vol[iz * N * N + iy * N + ix] = 1;
            continue;
          }
          const s = sdf(x, y, z, maxIter, power, bailout, formula, N, polarDeg);
          vol[iz * N * N + iy * N + ix] = s > 0 ? 1 : 0;
          if (s <= 0) inside++;
        }
      }
      onSlice(iz, N);
    }
    if (inside === 0) return null;
    return { vol: vol, N: N, range: range, step: step };
  }

  function v(vol, N, ix, iy, iz) {
    return vol[iz * N * N + iy * N + ix] || 0;
  }

  function idx(N, ix, iy, iz) {
    return iz * N * N + iy * N + ix;
  }

  /** Safety cap for BFS queue length (JS number array ~8 B per entry). */
  const MAX_BFS_CELLS = 36 * 1024 * 1024;

  /**
   * 6-connected BFS over inside voxels (vol[i]===0).
   * `state`: 0 = not yet counted in any component; 1 = in current BFS queue; 2 = counted (done).
   * Never clears "2" — otherwise the same component would be traversed again (infinite loop).
   * @returns {number[]|null} list of cell indices, or null if overflow
   */
  function bfsInsideCells(vol, N, state, seed) {
    const qq = [seed];
    state[seed] = 1;
    let qi = 0;
    while (qi < qq.length) {
      if (qq.length > MAX_BFS_CELLS) {
        for (let j = 0; j < qq.length; j++) {
          state[qq[j]] = 0;
        }
        return null;
      }
      const cur = qq[qi++];
      const cix = cur % N;
      const t = (cur / N) | 0;
      const ciy = t % N;
      const ciz = (t / N) | 0;
      if (cix > 0) {
        const n = cur - 1;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
      if (cix + 1 < N) {
        const n = cur + 1;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
      if (ciy > 0) {
        const n = cur - N;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
      if (ciy + 1 < N) {
        const n = cur + N;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
      if (ciz > 0) {
        const n = cur - N * N;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
      if (ciz + 1 < N) {
        const n = cur + N * N;
        if (vol[n] === 0 && state[n] === 0) {
          state[n] = 1;
          qq.push(n);
        }
      }
    }
    for (let i = 0; i < qq.length; i++) {
      state[qq[i]] = 2;
    }
    return qq;
  }

  /** BFS marking `mark[i]=1` for the main component only (fresh mark array). */
  function bfsMarkMain(vol, N, mark, seed) {
    const qq = [seed];
    mark[seed] = 1;
    let qi = 0;
    while (qi < qq.length) {
      if (qq.length > MAX_BFS_CELLS) {
        mark.fill(0);
        return null;
      }
      const cur = qq[qi++];
      const cix = cur % N;
      const t = (cur / N) | 0;
      const ciy = t % N;
      const ciz = (t / N) | 0;
      if (cix > 0) {
        const n = cur - 1;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
      if (cix + 1 < N) {
        const n = cur + 1;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
      if (ciy > 0) {
        const n = cur - N;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
      if (ciy + 1 < N) {
        const n = cur + N;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
      if (ciz > 0) {
        const n = cur - N * N;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
      if (ciz + 1 < N) {
        const n = cur + N * N;
        if (vol[n] === 0 && !mark[n]) {
          mark[n] = 1;
          qq.push(n);
        }
      }
    }
    return qq;
  }

  /**
   * Keep a single printable shell: remove inside voxels not in the largest 6-connected
   * inside component (removes voxel noise / floating crumbs from coarse grid).
   * @returns {{ removed: number, skipped: boolean }}
   */
  function keepLargestInsideComponent(vol, N, onProgress) {
    const total = N * N * N;
    const state = new Uint8Array(total);
    let bestSeed = -1;
    let bestSize = 0;

    for (let iz = 0; iz < N; iz++) {
      if (iz % 4 === 0) onProgress(iz / N);
      for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
          const start = idx(N, ix, iy, iz);
          if (vol[start] !== 0 || state[start] !== 0) continue;

          const cells = bfsInsideCells(vol, N, state, start);
          if (cells === null) {
            state.fill(0);
            return { removed: 0, skipped: true };
          }
          const sz = cells.length;
          if (sz > bestSize) {
            bestSize = sz;
            bestSeed = start;
          }
        }
      }
    }

    if (bestSeed < 0 || bestSize === 0) {
      return { removed: 0, skipped: false };
    }

    const mainMark = new Uint8Array(total);
    const mainCells = bfsMarkMain(vol, N, mainMark, bestSeed);
    if (mainCells === null) {
      return { removed: 0, skipped: true };
    }

    let removed = 0;
    for (let i = 0; i < total; i++) {
      if (vol[i] === 0 && !mainMark[i]) {
        vol[i] = 1;
        removed++;
      }
    }

    return { removed: removed, skipped: false };
  }

  function buildShellPositions(vol, N, range, step, onShellSlice) {
    const positions = [];

    function addFace(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3) {
      positions.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
      positions.push(x0, y0, z0, x2, y2, z2, x3, y3, z3);
    }

    const n1 = N - 1;
    for (let iz = 0; iz < n1; iz++) {
      for (let iy = 0; iy < n1; iy++) {
        for (let ix = 0; ix < n1; ix++) {
          const cell = v(vol, N, ix, iy, iz);
          if (cell !== v(vol, N, ix + 1, iy, iz)) {
            const x = -range + (ix + 1) * step;
            const y0 = -range + iy * step;
            const y1 = -range + (iy + 1) * step;
            const z0 = -range + iz * step;
            const z1 = -range + (iz + 1) * step;
            if (cell === 0) addFace(x, y0, z0, x, y1, z0, x, y1, z1, x, y0, z1);
            else addFace(x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0);
          }
          if (cell !== v(vol, N, ix, iy + 1, iz)) {
            const y = -range + (iy + 1) * step;
            const x0 = -range + ix * step;
            const x1 = -range + (ix + 1) * step;
            const z0 = -range + iz * step;
            const z1 = -range + (iz + 1) * step;
            if (cell === 0) addFace(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
            else addFace(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
          }
          if (cell !== v(vol, N, ix, iy, iz + 1)) {
            const z = -range + (iz + 1) * step;
            const x0 = -range + ix * step;
            const x1 = -range + (ix + 1) * step;
            const y0 = -range + iy * step;
            const y1 = -range + (iy + 1) * step;
            if (cell === 0) addFace(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
            else addFace(x0, y0, z, x0, y1, z, x1, y1, z, x1, y0, z);
          }
        }
      }
      onShellSlice(iz, n1);
    }

    if (positions.length === 0) return null;
    return new Float32Array(positions);
  }

  self.onmessage = function (e) {
    const data = e.data;
    if (!data || data.type !== 'run') return;

    const res = data.res | 0;
    const requestedRes = data.requestedRes != null ? data.requestedRes | 0 : res;
    const iter = data.iter | 0;
    const power = +data.power;
    const bail = +data.bail;
    const polarDeg = Number.isFinite(+data.polarDeg) ? +data.polarDeg : 0;
    const allowed = { mandelbulb: 1, mandelbox: 1, menger: 1 };
    const formula =
      typeof data.formula === 'string' && allowed[data.formula] ? data.formula : 'mandelbulb';

    lastProgressAt = 0;
    const t0 = self.performance.now();

    try {
      emitProgress(0, 'Filling voxel grid…');

      const filled = fillVolume(res, iter, power, bail, formula, function (iz, N) {
        emitProgress(0.32 * ((iz + 1) / N), 'Filling voxel grid…');
      }, polarDeg);

      if (!filled) {
        self.postMessage({
          type: 'fail',
          fail: 'empty',
          requestedRes: requestedRes,
          res: res,
        });
        return;
      }

      const { vol, N, range, step } = filled;
      let islandCull = { removed: 0, skipped: false };
      if (formula !== 'menger') {
        emitProgress(0.32, 'Removing stray voxels…');
        islandCull = keepLargestInsideComponent(vol, N, function (frac) {
          emitProgress(0.32 + 0.1 * frac, 'Removing stray voxels…');
        });
      } else {
        /* 6-connected "largest component" cull tears Menger struts at voxel size → stick artefact. */
        emitProgress(0.35, 'Menger: skip island filter…');
      }

      emitProgress(0.42, 'Building shell mesh…');
      const posFlat = buildShellPositions(vol, N, range, step, function (iz, n1) {
        emitProgress(0.42 + 0.58 * ((iz + 1) / n1), 'Building shell mesh…');
      });

      const t1 = self.performance.now();

      if (!posFlat) {
        self.postMessage({
          type: 'fail',
          fail: 'no_boundary',
          requestedRes: requestedRes,
          res: res,
        });
        return;
      }

      emitProgress(1, 'Complete');

      const buf = posFlat.buffer;
      self.postMessage(
        {
          type: 'done',
          positionBuffer: buf,
          floatCount: posFlat.length,
          elapsedMs: t1 - t0,
          requestedRes: requestedRes,
          res: res,
          islandsRemoved: islandCull.removed,
          islandCullSkipped: islandCull.skipped,
          formula: formula,
        },
        [buf]
      );
    } catch (err) {
      self.postMessage({
        type: 'fail',
        fail: 'error',
        message: err && err.message ? err.message : String(err),
        requestedRes: requestedRes,
        res: res,
      });
    }
  };
})();
