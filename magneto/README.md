# Mag-Heat AR (Camera + Magnetometer)

A single-page experimental web app that visualizes **sharp changes in the magnetic field** as a **semi-transparent heatmap overlay** on top of the live **camera feed**.

The app is intentionally minimal and browser-only: no build step, no backend, no frameworks.  
It’s meant as a **sensor-fusion playground** rather than a polished product.

---

## What this app does (conceptually)

- Uses the **camera** as a visual reference of the physical world
- Uses the **magnetometer** to detect *local magnetic disturbances*
- Uses **device orientation** to roughly map sensor events to screen directions
- Highlights **rapid magnetic field changes** (not absolute field strength)
- Renders them as **decaying, additive heat blobs** over the camera image

Think of it as a *“magnetic anomaly viewer”*, not a compass.

---

## Core idea

Absolute magnetic field values are boring and noisy.

What's interesting is:

**Δ|B| / Δt** (how fast the magnetic field changes)

Sharp changes often correlate with:
- nearby metal objects
- moving machinery
- speakers / magnets
- elevators, doors, vehicles
- phone approaching or leaving an object

The app visualizes **where and when** those changes happen.

---

## Technologies used

### Web APIs

#### Camera
- `navigator.mediaDevices.getUserMedia`
- Video stream rendered via `<video>`
- Back camera preferred (`facingMode: environment`)

#### Magnetometer
- `Magnetometer` (Generic Sensor API)
- Reads `x, y, z` in **microtesla (µT)**
- Uses magnitude `|B| = sqrt(x² + y² + z²)`
- **Important:** support is browser- and OS-dependent

#### Device Orientation
- `deviceorientation` event
- Used only for **approximate direction mapping**
- On iOS requires explicit permission (`DeviceOrientationEvent.requestPermission()`)

---

### Rendering

- `<canvas>` overlay on top of video
- 2D Canvas API (no WebGL)
- Additive blending (`globalCompositeOperation = "lighter"`)
- Radial gradients for heat blobs
- Manual decay/fade each frame

Canvas is DPI-aware (handles `devicePixelRatio`).

---

## Application structure

The entire app lives in **one HTML file**.

Logical structure (inside `<script>`):

```
init
├── camera
├── orientation
├── magnetometer
├── heatmap renderer
├── UI / controls
└── main loop
```

### Main components

#### 1. Camera module
Responsible for:
- requesting camera permission
- starting/stopping the video stream
- attaching stream to `<video>`

No frame processing is done on the video itself.

---

#### 2. Orientation module
- Listens to `deviceorientation`
- Tracks `yaw / pitch / roll` in degrees
- Converts `(yaw, pitch)` → normalized screen coordinates

Used only to decide **where on screen** a magnetic event is drawn.

If orientation is unavailable:
- blobs fall back to screen center

---

#### 3. Magnetometer module
Key logic:

- Reads `(x, y, z)` in µT
- Computes magnitude `|B|`
- Computes derivative:

```
dB/dt = | |B(t)| - |B(t-1)| | / Δt
```

- Applies a threshold
- Emits an "event" when the threshold is exceeded

Only rapid changes produce heat.

#### 4. Heatmap renderer
Each magnetic spike creates a blob:

position: derived from orientation

size: configurable

color: mapped from intensity

alpha: intensity-dependent

Blobs:

are additive

fade over time via decay pass

accumulate to show hotspots

#### 5. UI / Controls
Simple in-page controls:

Threshold — minimum dB/dt to trigger a blob

Gain — amplifies visual intensity

Decay — how fast heat fades

Blob size — radius in pixels

HUD indicators show:

camera availability

magnetometer availability

orientation availability

live field magnitude and derivative

#### 6. Main loop
Driven by requestAnimationFrame:

applies decay

updates HUD

keeps rendering continuous

Magnetometer events are event-driven, not polled.

## Important limitations

Magnetometer API is not universally supported

iOS Safari support is inconsistent

Sensor frequencies are browser-clamped

Orientation mapping is approximate, not world-locked

No true spatial mapping or SLAM

This is a perceptual instrument, not a measurement device.

## How to run

Serve over HTTPS (required for sensors & camera)

Open on a phone with a magnetometer

Grant camera + motion permissions

Move phone near metal objects or devices

If magnetometer is unavailable:

app still shows camera

heatmap stays inactive

## Intended future extensions

Things this architecture is designed to grow into:

Recording short magnetic “fingerprints”

Comparing fingerprints with ML in-browser

Event classification (door / elevator / vehicle)

Temporal heatmaps (waterfall view)

Sensor fusion with audio or accelerometer

WebGPU-based inference

