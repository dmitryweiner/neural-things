# Voxel isosurface explorer

Browser tool that voxelizes a signed field (Mandelbulb, Mandelbox, or Menger sponge), builds a triangle shell for preview, and can export the same geometry as ASCII STL. Heavy work runs in a Web Worker with a progress bar.

## Layout

- `index.html` — page shell, styles, controls
- `mandelbulb.js` — Three.js scene, UI, worker orchestration
- `mandelbulb-worker.js` — voxel fill, optional island cull, shell positions

Shared UI: `../lib/nt-ui.css` and `../lib/nt-ui.js`.

## Limits

Grid resolution is capped at **400** on the slider (memory and runtime). The worker may lower the effective grid further if the browser heap limit is tight.
