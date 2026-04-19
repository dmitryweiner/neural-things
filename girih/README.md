# Girih — N-fold symmetry pattern generator

A single-page web app for generating girih / kaleidoscopic patterns. You draw a
motif inside one fundamental wedge and the app replicates it around the center
with N-fold rotational symmetry (and optional mirror reflection), then — if you
want — repeats the resulting rosette on a square or hexagonal grid for a
seamless tile preview.

No build step — vanilla HTML + JS. Shares `lib/nt-ui.css` and `lib/nt-ui.js`
with other apps in this repo.

## Run locally

Any static server works, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/girih/
```

## Controls

**Tools**

- **Freehand (F)** — hold the mouse/finger down and draw a stroke. The stroke
  is folded into the fundamental wedge and replicated around the center.
- **Polyline (P)** — click to place vertices; the segment under the cursor is
  a live preview. **Enter** or **double-click** commits the polyline.
  **Esc** cancels. Hold **Shift** while moving to disable snap.

**Symmetry**

- Order `N` ∈ {4, 6, 8, 10, 12} — number of rotational copies.
- **Mirror** — adds a reflection (switches from C_N to D_N — 2N copies total).
  The fundamental wedge then halves to π/N.

**Snap**

- **Radial** — snaps the angle to subdivisions of the wedge.
- **Rings** — snaps the radius to concentric circles.
- Hold **Shift** while placing a polyline vertex to bypass snap for one click.

**Tile preview**

- **Off** — single rosette, with guides and active-wedge highlight.
- **Square grid** / **Hex grid** — the rosette becomes a tile and is repeated
  across the viewport. Adjust **Tile scale** to shrink/enlarge each copy.

**Other**

- **Undo / Redo** (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
- **Clear** — empties the canvas (undoable).
- **Save PNG** — high-resolution export without guides.
- **Save SVG** — vector export with one `<g>` per symmetry copy.

## How the symmetry works

Every pointer location is converted to polar coordinates `(r, θ)` relative to
the canvas center. The stroke is recorded in the **fundamental wedge** — the
angular slice `[0, 2π/N)` for pure rotation, or `[0, π/N]` when **Mirror** is
on. At render time, the wedge's strokes are drawn N times rotated by multiples
of `2π/N` (plus their mirrored copy in dihedral mode).

When you start drawing inside sector `k`, the app "locks" that sector so the
stroke stays under your cursor instead of jumping. Crossing a sector boundary
while dragging may produce a fold artefact — that's intentional geometry of
the kaleidoscope.

## Files

- `index.html` — page shell, settings drawer, shared-lib loaders.
- `girih.js` — state, rendering, input folding, snap, tile preview, export.
- `specification.md` — original design notes (Russian).
