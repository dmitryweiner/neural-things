# Moiré pattern generator

A small **vanilla JS** web app that draws **moiré** patterns: large-scale interference you get when two (or more) periodic line grids sit on top of each other with slightly different spacing, angle, or shift.

## Files

| File | Role |
|------|------|
| [`index.html`](index.html) | Page shell, layout, styles |
| [`moire.js`](moire.js) | Canvas drawing, settings UI, save to PNG |
| [`instructions.md`](instructions.md) | Original product notes (Russian) |

Shared UI: [`../lib/nt-ui.css`](../lib/nt-ui.css), [`../lib/nt-ui.js`](../lib/nt-ui.js) (`NT.ui.fmt`, `setupAdjustmentButtons` for slider ±).

## What you can adjust

- **Background color** — solid fill behind all grids.
- **Several grids** — add/remove layers; each layer has:
  - **Type** — square (orthogonal lines), hex-style (three 60° families), or triangle-style (same three families with a phase shift).
  - **Color** and **opacity** — browser color picker + slider.
  - **Grid step** — line spacing (0–48 px, step 0.1; 0 is allowed in the UI and clamped internally for drawing).
  - **Tilt** — rotation in degrees (step 0.1°).
  - **Shift X / Y** — offset of that layer’s origin on the canvas.

**Save** downloads the current canvas as a PNG (`moire-<timestamp>.png`).

## UI behavior

- The **canvas fills the viewport** below the header (title + **Settings** / **Save**).
- **Settings** toggles a drawer: **from the right** on wider screens (over the canvas, canvas size unchanged); on **narrow screens** it becomes a **bottom sheet** so you still see the pattern above while editing.
- The label shows **Settings ▶** when closed and **Settings ▼** when open. **Escape** or a click on the empty area outside the drawer closes it (no dimming overlay).
- Interface language is **English**.

## Defaults

The built-in preset uses two square grids tuned for a clear moiré (cyan / magenta, different steps and tilts). Adjust freely from there.
