# Mag-Heat AR (Camera + Magnetometer)

A single-page experimental web app that visualizes **sharp changes in the magnetic field** as a **semi-transparent heatmap overlay** on top of the live **camera feed**.

The app is intentionally minimal and browser-only: no build step, no backend, no frameworks.  
It's meant as a **sensor-fusion playground** rather than a polished product.

---

## What this app does (conceptually)

- Uses the **camera** as a visual reference of the physical world
- Uses the **magnetometer** to detect *local magnetic disturbances*
- Uses **device orientation** to roughly map sensor events to screen directions
- Highlights **rapid magnetic field changes** (not absolute field strength)
- Renders them as **decaying, additive heat blobs** over the camera image

Think of it as a *"magnetic anomaly viewer"*, not a compass.

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

#### Permissions API
- Used to query magnetometer permission status before starting
- Shows permission state in the debug panel
- Handles `granted`, `denied`, and `prompt` states

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
├── debug panel
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

#### 4. Debug panel

Collapsible panel showing diagnostic information:

- **API**: Whether `Magnetometer` is available in `window`
- **Permission**: Current permission status (`granted` / `denied` / `prompt`)
- **Sensor**: Sensor state (`not started` / `initializing` / `active` / `error`)
- **Last error**: Detailed error message if something failed
- **User Agent**: Browser identification string

Click the "Debug" button in the HUD to toggle the panel.

#### 5. Heatmap renderer
Each magnetic spike creates a blob:

position: derived from orientation

size: configurable

color: mapped from intensity

alpha: intensity-dependent

Blobs:

are additive

fade over time via decay pass

accumulate to show hotspots

#### 6. UI / Controls
Simple in-page controls:

**Toggle button** (▶ Start / ⏹ Stop):
- Green when stopped (ready to start)
- Orange when running (click to stop)

**Sliders:**
- Threshold — minimum dB/dt to trigger a blob
- Gain — amplifies visual intensity
- Decay — how fast heat fades
- Blob size — radius in pixels

HUD indicators show:

camera availability

magnetometer availability

orientation availability

live field magnitude and derivative

#### 7. Main loop
Driven by requestAnimationFrame:

applies decay

updates HUD

keeps rendering continuous

Magnetometer events are event-driven, not polled.

---

## Troubleshooting

### `mag: no` on Android Chrome

If the magnetometer shows as unavailable (`mag: no`), check the Debug panel for details.

#### API shows "not available"

The Generic Sensor API for magnetometer **requires an experimental flag** in Chrome on Android:

1. Open `chrome://flags` in Chrome
2. Search for **Generic Sensor Extra Classes**
3. Set to **Enabled**
4. Tap "Relaunch" to restart Chrome
5. Return to this page and try again

The Debug panel will show this instruction automatically when it detects Android Chrome without the API.

#### API available but sensor fails

**Common causes:**

1. **SecurityError**: HTTPS is required. The Generic Sensor API only works on secure origins.

2. **NotAllowedError**: Permission was denied. Check:
   - Chrome site settings → Sensors
   - Android system settings → App permissions → Body sensors
   
3. **NotReadableError**: Hardware sensor not available or not accessible.

4. **Permission blocked by policy**: Some enterprise/managed devices block sensor access.

**Steps to diagnose:**

1. Open the Debug panel (click "Debug" button)
2. Check "API" — should show "✓ Magnetometer available"
3. Check "Permission" — shows browser permission status
4. Check "Sensor" and "Last error" for specific failure details

**Note:** Even if `Magnetometer` is in `window`, the browser may block actual sensor access based on permissions policy or site settings.

### iOS Safari

- Magnetometer API is **not supported** on iOS Safari
- Device orientation requires explicit permission (handled automatically)
- App will work in camera-only mode

### Desktop browsers

- Most desktop browsers don't have magnetometer hardware
- App will show camera feed but no magnetic visualization

---

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

Recording short magnetic "fingerprints"

Comparing fingerprints with ML in-browser

Event classification (door / elevator / vehicle)

Temporal heatmaps (waterfall view)

Sensor fusion with audio or accelerometer

WebGPU-based inference
