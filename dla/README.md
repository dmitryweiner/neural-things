# DLA Pseudo-Fractal Simulation

A single-page web application for simulating **Diffusion-Limited Aggregation (DLA)** — a process where particles randomly walk and stick to an existing cluster, creating beautiful fractal-like structures.

## What is DLA?

In DLA simulation:
1. A seed particle is placed at the center
2. New particles spawn at a distance and perform a random walk
3. When a walking particle touches the cluster, it sticks at the contact point based on adhesion probability
4. The process repeats, growing intricate branching patterns

By adjusting directional adhesion probabilities, you can create symmetric "snowflake" patterns with 3-fold (120°) or 6-fold (60°) symmetry.

## How to Run

Simply open `index.html` in any modern web browser. No server or build step required.

**Note**: Due to Web Worker security restrictions, you may need to serve the files via a local HTTP server (e.g., `python -m http.server`) instead of opening `index.html` directly from the file system.

## Files

- `index.html` — Main page with UI, rendering, and camera controls
- `dla-worker.js` — Web Worker with all simulation logic
- `dla-sound.js` — FM synthesis sound module

## Controls

### Navigation

| Action | Desktop | Mobile |
|--------|---------|--------|
| **Zoom** | Mouse wheel | Pinch gesture |
| **Pan** | Click and drag | Touch and drag |

### Buttons

- **Start / Stop** — Start or stop the simulation (simulation continues even when page is in background)
- **Reset** — Clear the simulation and start fresh with a single seed particle
- **Center** — Reset camera to origin with zoom 1.0
- **Save image** — Download the current canvas as a PNG file

## Settings Panel

### Sound

Each particle that sticks to the cluster produces a short **FM synthesis** tone:

- **X position** controls **pitch**: Center (x=0) = 660 Hz. Moving right increases frequency, left decreases it.
- **Y position** controls **volume**: Top = quieter, bottom = louder.

#### What is FM Synthesis?

FM (Frequency Modulation) synthesis creates sound by modulating one oscillator's frequency with another. Using a non-integer frequency ratio (2.5) produces inharmonic, metallic/glassy timbres. Combined with a very fast envelope (5ms attack, exponential decay), this creates short percussive sounds reminiscent of bells, chimes, or glass.

#### Sound Settings

| Setting | Range | Description |
|---------|-------|-------------|
| **Enable on stick** | on/off | Toggle sound on/off (default: on) |
| **Master volume** | 0–100% | Overall volume of all sounds |
| **X → Pitch** | 0.1–3.0 | Multiplier for pitch range. Higher = wider frequency variation |
| **Y → Volume** | 0.1–3.0 | Multiplier for volume range. Higher = more volume variation |

This creates an ambient soundscape that reflects the fractal's growth pattern.

### Particle Colors

- **Constant**: All particles use a single color (configurable via color picker)
- **Rainbow**: Particles cycle through the HSL hue spectrum based on their order of attachment
  - **Rainbow step**: Hue increment per particle (0.01–0.5). Lower values = smoother gradients.

### Adhesion Settings

**Base adhesion** (0–1): The baseline probability that a particle sticks when it contacts the cluster.

**Direction multipliers**: Each of the 12 directions (30° step: 0°, 30°, 60°, ..., 330°) has a multiplier (0–2×) that modifies the base adhesion.

Final adhesion probability = `baseAdhesion × dirMult[contactDirection]`

#### Presets

| Preset | Effect | Result |
|--------|--------|--------|
| **Isotropic** | All directions equal (1×) | Organic, irregular branching |
| **120°** | Strong at 0°, 120°, 240°; weak elsewhere | 3-fold symmetric patterns |
| **60° (strict)** | All directions at 2× | Dense 6-fold hexagonal patterns |

You can also manually adjust each direction's slider to create custom asymmetric patterns.

### Settings Persistence

All settings are automatically saved to **localStorage** and restored when you revisit the page:

- Color mode and constant color
- Rainbow step value
- Base adhesion and direction multipliers
- Sound settings (enabled, master volume, pitch coefficient, volume coefficient)
- Settings panel open/closed state

## Architecture

The simulation uses a **Web Worker** to run physics calculations in a separate thread:

```
┌─────────────────────┐         ┌─────────────────────┐
│    Main Thread      │         │     Web Worker      │
│                     │         │   (dla-worker.js)   │
│  • UI controls      │ ──────► │  • Random walk      │
│  • Canvas render    │ start/  │  • Collision detect │
│  • Camera/zoom      │ stop/   │  • Spatial hash     │
│  • Color mapping    │ reset   │  • Adhesion logic   │
│  • Audio (K-S)      │         │                     │
│                     │         │                     │
│  points[] ◄─────────│ ◄────── │  Batched particles  │
│  (for rendering)    │ (x,y,i) │  (50k steps/batch)  │
└─────────────────────┘         └─────────────────────┘
```

**Benefits:**
- Simulation runs at maximum speed (not limited to 60 FPS)
- UI remains responsive even during heavy computation
- Continues running when the browser tab is in background
- Particles are sent in batches for efficiency

## Technical Details

- **Coordinates**: Continuous (x, y) world coordinates — particles stick exactly where they touch
- **Spatial indexing**: Hash grid for fast neighbor lookup (in worker)
  - Numeric keys instead of strings to avoid allocations
  - Reusable buffer for neighbor queries (zero GC pressure in hot path)
- **Rendering**: HTML5 Canvas with device pixel ratio support, 60 FPS
- **Performance**: Frustum culling for off-screen particles; 50,000 random walk steps per batch in worker
- **Spawn/Kill radius**: Particles spawn at `maxRadius + 40` pixels and are killed if they wander beyond `maxRadius + 80` pixels
- **Background execution**: Web Worker continues simulation even when the browser tab is inactive
- **Audio synthesis**: [FM synthesis](https://en.wikipedia.org/wiki/Frequency_modulation_synthesis) generates metallic/glassy clicks using Web Audio API
  - Real-time oscillator modulation (carrier + modulator)
  - Very short envelope (2ms attack, 80-120ms exponential decay) for thin clicks
  - X position controls carrier frequency (pitch)
  - Y position controls modulator ratio and volume
  - Distance from center controls modulation depth and decay time
- **Settings persistence**: All user preferences stored in localStorage

## HUD Display

The bottom-left overlay shows:
- **Particles**: Total stuck particles count
- **Radius**: Current cluster radius in world pixels
- **Zoom**: Current camera zoom level
- **STOPPED**: Shown when simulation is not running

## Mobile Support

The simulation is fully functional on mobile devices:
- Touch and drag to pan the view
- Pinch to zoom in/out
- Full-screen canvas for immersive experience

## License

Part of the [neural-things](https://github.com/dmitryweiner/neural-things) collection.
