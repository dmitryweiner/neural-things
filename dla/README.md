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

## Controls

### Navigation

| Action | Desktop | Mobile |
|--------|---------|--------|
| **Zoom** | Mouse wheel | Pinch gesture |
| **Pan** | Click and drag | Touch and drag |

### Buttons

- **Start / Stop** — Start or stop the simulation (simulation continues even when page is in background)
- **Pause / Resume** — Pause the running simulation
- **Reset** — Clear the simulation and start fresh with a single seed particle
- **Center view** — Reset camera to origin with zoom 1.0
- **Save image** — Download the current canvas as a PNG file

## Settings Panel

### Simulation Speed

Dropdown with three options:
- **Fast (60 FPS)** — Maximum growth speed
- **Medium (30 FPS)** — Balanced speed (default)
- **Slow (10 FPS)** — Slow, relaxing growth

### Walker Visibility
- **Show moving particle**: Toggle to show/hide the currently walking particle (white dot).

### Particle Colors

- **Constant**: All particles use a single color (configurable via color picker)
- **Rainbow**: Particles cycle through the HSL hue spectrum based on their order of attachment
  - **Hue step**: Degrees to advance per particle (1–90). Lower values = smoother gradients.

### Adhesion Settings

**Base adhesion** (0–1): The baseline probability that a particle sticks when it contacts the cluster.

**Direction multipliers**: Each of the 6 directions (0°, 60°, 120°, 180°, 240°, 300°) has a multiplier (0–2×) that modifies the base adhesion.

Final adhesion probability = `baseAdhesion × dirMult[contactDirection]`

#### Presets

| Preset | Effect | Result |
|--------|--------|--------|
| **Isotropic** | All directions equal (1×) | Organic, irregular branching |
| **120°** | Strong at 0°, 120°, 240°; weak elsewhere | 3-fold symmetric patterns |
| **60° (strict)** | All directions at 2× | Dense 6-fold hexagonal patterns |

You can also manually adjust each direction's slider to create custom asymmetric patterns.

## Technical Details

- **Coordinates**: Continuous (x, y) world coordinates — particles stick exactly where they touch
- **Spatial indexing**: Hash grid for fast neighbor lookup
- **Rendering**: HTML5 Canvas with device pixel ratio support
- **Performance**: Frustum culling for off-screen particles; 200 random walk steps per tick
- **Spawn/Kill radius**: Particles spawn at `maxRadius + 40` pixels and are killed if they wander beyond `maxRadius + 80` pixels
- **Background execution**: Uses `setInterval` for simulation, allowing growth to continue even when the browser tab is inactive

## HUD Display

The bottom-left overlay shows:
- **Particles**: Total stuck particles count
- **Radius**: Current cluster radius in world pixels
- **Zoom**: Current camera zoom level
- **STOPPED**: Shown when simulation is not running
- **PAUSED**: Shown when simulation is paused

## Mobile Support

The simulation is fully functional on mobile devices:
- Touch and drag to pan the view
- Pinch to zoom in/out
- Full-screen canvas for immersive experience

## License

Part of the [neural-things](https://github.com/dmitryweiner/neural-things) collection.
