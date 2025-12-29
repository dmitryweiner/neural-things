# Ultrasonic Tone Sonogram (19 kHz) — Browser Prototype

This is a **single-page web prototype** that emits short **19 kHz tone bursts** from **one stereo channel** (Left or Right), records the microphone response, measures the **signal energy at the target frequency over time**, and visualizes the result as a **polar sonogram** where:

- **Angle** ≈ device heading / orientation (0° at top, clockwise like a compass)
- **Radius** ≈ time-of-flight (delay after emission); center = close, edge = far
- **Brightness** ≈ relative energy at ~19 kHz in that time window
- **Green line** = current device heading indicator

> ⚠️ Practical note: many consumer devices aggressively filter near-ultrasonic frequencies (speakers, microphones, OS processing, echo cancellation, noise suppression, auto gain). Results vary widely between devices.

---

## High-level architecture

The app is intentionally kept as a **single HTML file** with embedded JavaScript. It has four main subsystems:

1. **UI + Control Layer**
   - Sticky top bar with main control buttons (Start/Stop toggle, Export PNG).
   - Clear button overlaid on the sonogram canvas (top-right corner) for quick access.
   - Collapsible settings panel with slider-based parameters (frequency, burst length, listen time, channel, amplitude, analysis window sizes).
   - Each slider has +/- buttons for fine adjustment with hold-to-repeat behavior.
   - Collapsible info panel showing status, sensor readings (sample rate, heading), Wake Lock status, and real-time intensity chart.
   - **Intensity chart**: displays current angle's intensity data as a line graph (X = time after burst, Y = intensity). Only updates when the info panel is open to save resources.

2. **Audio I/O Layer (Web Audio API)**
   - Creates an `AudioContext`.
   - Plays a tone burst through the selected stereo channel (Left or Right).
   - Captures microphone audio in real time using either:
     - `AudioWorkletNode` (preferred), or
     - `ScriptProcessorNode` (fallback).

3. **Signal Processing + Visualization Layer**
   - After each emission, records a short microphone window (burst + listening interval).
   - Skips most of the direct emission portion to reduce immediate leakage.
   - Computes energy at the target frequency per time frame using a single-frequency detector (Goertzel).
   - Stores energy data in a polar data structure `polarData[angle][radius]`.
   - Renders the sonogram in polar coordinates with the current heading indicator.

4. **Device Management Layer**
   - Handles device orientation events for heading.
   - Manages Wake Lock API to prevent screen sleep during scanning.

---

## Data flow per scan cycle

Each scan cycle (one emitted burst) follows this pipeline:

1. **Read current heading**
   - If sensors are enabled and supported:
     - Use `webkitCompassHeading` on iOS Safari when available.
     - Otherwise use `DeviceOrientationEvent.alpha` (may be relative or unreliable as a compass).
   - If heading is unavailable, the prototype falls back to a synthetic angle based on time.

2. **Emit a tone burst**
   - Generate a Hann-windowed sine burst at `freq` Hz for `burstMs` milliseconds.
   - Write the burst into one channel of a stereo buffer; the other channel is silent.
   - Play via `AudioBufferSourceNode` into `audioCtx.destination`.

3. **Record microphone audio**
   - Record for `burstDuration + listenMs`.
   - Capture mono samples from the microphone stream.

4. **Remove immediate leakage**
   - Discard the first ~90% of the burst duration from the recorded buffer.
   - The remaining tail buffer represents the "listening" segment.

5. **Compute energy envelope at ~19 kHz**
   - Slice the tail into overlapping frames of `frameSize` samples with hop `hopSize`.
   - For each frame compute single-frequency power using the **Goertzel algorithm**.

6. **Store in polar data structure**
   - Map the heading angle to one of 360 buckets (1° resolution).
   - Map the energy envelope bins to 256 radius bins.
   - Store normalized energy values in `polarData[angle][radius]`.

7. **Render polar sonogram**
   - For each pixel on the square canvas, compute its polar coordinates (angle, radius).
   - Look up the corresponding energy value from `polarData`.
   - Draw grayscale pixel (brighter = more energy).
   - Overlay reference circles and cardinal lines.
   - Draw a green line from center to edge showing current heading.

---

## Polar visualization model

The sonogram uses a **polar coordinate system** rendered on a square canvas:

- **Center** = device position (no delay / immediate reflection)
- **Edge** = maximum measured delay
- **Angle** = device heading (0° at top, clockwise)
- **Brightness** = normalized energy at 19 kHz

Visual elements:
- **Grayscale data**: each pixel's brightness corresponds to measured energy at that angle/range
- **Reference circles**: concentric circles at 25%, 50%, 75% of max radius
- **Cardinal lines**: horizontal and vertical lines through center
- **Green heading line**: shows current device orientation in real-time
- **Green dot + label**: marks the exact heading angle at the edge

Data storage:
- `polarData[360][256]` — 360 angle buckets (1° each) × 256 radius bins
- Updated incrementally as the device rotates

This representation is more intuitive for sonar-like applications than a rectangular X-Y plot, as it mimics traditional radar/sonar displays.

---

## Wake Lock API

To prevent the phone from sleeping during scanning sessions, the app uses the **Screen Wake Lock API**:

- **Automatic activation**: Wake Lock is requested when scanning starts.
- **Automatic release**: Wake Lock is released when scanning stops.
- **Visibility handling**: If the page becomes hidden and then visible again while scanning, the Wake Lock is re-acquired (required by the API specification).
- **Status indicator**: A badge in the UI shows the current Wake Lock state:
  - 🔒 **Active** — screen will stay on
  - 🔓 **Inactive** — screen may sleep
  - ⚠️ **Unsupported** — browser doesn't support Wake Lock API

> Note: Wake Lock API requires HTTPS (or localhost) and is supported in Chrome, Edge, and other Chromium-based browsers. Safari support is limited.

---

## Orientation / heading subsystem

### How it works
The app uses **device orientation events** rather than a phased array:

- Sensors are **automatically enabled** when the user clicks **Start** (requires user gesture for iOS permission).
- The app registers a `deviceorientation` listener.
- Heading selection priority:
  1. `ev.webkitCompassHeading` (best on iOS Safari)
  2. `ev.alpha` when `ev.absolute === true`
  3. fallback `ev.alpha` even if not absolute (may be relative yaw)

### Caveats
- On many Android devices `alpha` is not a true compass heading.
- Magnetic interference and sensor calibration affect accuracy.
- Some browsers require explicit permission and a user gesture (especially iOS).

---

## Signal processing details (Goertzel)

For a single target frequency `f0` (e.g. 19000 Hz), Goertzel computes the power of that frequency component in a frame without a full FFT.

For each frame of length `N`, it computes:

- `k = round(N * f0 / sampleRate)`
- `ω = 2πk/N`
- Recurrence:
  - `s[n] = x[n] + 2cos(ω)s[n-1] - s[n-2]`
- Power estimate:
  - `P ≈ s[N-1]^2 + s[N-2]^2 - 2cos(ω)s[N-1]s[N-2]`

This is:
- Faster/simpler than FFT for one frequency
- Suitable for constructing a time-varying energy envelope at a single frequency

---

## UI controls

### Top bar buttons

- **Start/Stop** (toggle button)
  - Green "▶ Start" when stopped, orange "⏹ Stop" when running
  - Start: enables sensors, activates Wake Lock, initializes audio, starts scan loop
  - Stop: stops scan loop, releases Wake Lock
- **Export PNG**
  - Downloads the current canvas as a PNG
- **⚙️ Settings** (toggle)
  - Opens/closes the collapsible settings panel
- **📊 Info** (toggle)
  - Opens/closes the system info panel (status, sample rate, heading, wake lock, intensity chart)

### Sonogram canvas overlay

- **Clear** (button in top-right corner of the sonogram)
  - Clears the polar sonogram data and redraws empty display
  - Positioned directly on the canvas for quick access during scanning

### Settings panel (collapsible)

All numeric parameters use sliders with +/- fine adjustment buttons:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Frequency (Hz) | 16000–20000 | 19000 | Tone frequency |
| Burst duration (ms) | 1–40 | 6 | Duration of emitted tone burst |
| Listen after (ms) | 5–250 | 50 | How long to keep recording after emission |
| Output channel | L/R | Left | Left or Right speaker output |
| Amplitude | 0.01–1 | 0.18 | Output volume scalar (use low values) |
| Frame size (samples) | 128–4096 | 512 | Analysis window size for Goertzel |
| Hop (samples) | 32–2048 | 128 | Step between frames (overlap) |

The +/- buttons support hold-to-repeat for continuous adjustment.

---

## Expected limitations

1. **Hardware frequency response**
   - Many speakers/mics roll off above ~16–18 kHz.
   - Even if emission works, microphone capture may not.

2. **OS / browser audio processing**
   - Echo cancellation, noise suppression, and AGC can distort timing and amplitude.
   - The app requests them disabled, but the OS may ignore this.

3. **Acoustic coupling**
   - Direct path from speaker to mic dominates unless physically separated/shielded.

4. **Not true beamforming**
   - Only one speaker channel is used; there is no phased-array steering.

5. **Timing precision**
   - Browser scheduling + audio pipeline latency makes absolute range estimation approximate.

6. **Wake Lock support**
   - Not all browsers support the Wake Lock API (notably older Safari versions).

---

## Tips for better results

- Prefer **desktop + external USB audio interface** without "enhancement" processing.
- Reduce background noise and keep the phone/PC still while scanning.
- Keep amplitude low and avoid prolonged high-volume ultrasonic output.
- Try slightly lower frequencies (e.g. **17–18 kHz**) if 19 kHz is filtered out.
- Physically separate the emitting speaker from the mic if possible.

---

## Files

- `index.html` (or any single HTML file)
  - Contains everything: UI, sensors, audio emission, recording, processing, polar rendering.

---

## Future improvements (ideas)

- Add a **"Set 0°"** calibration button to define a user reference direction.
- Add temporal averaging or max-hold per angle bucket.
- Display approximate range in milliseconds/meters (with a user-configurable speed of sound).
- Replace per-burst normalization with a global rolling normalization for stable brightness.
- Add an FFT-based spectral view for debugging microphone response near 19 kHz.
- Store raw frames and export data as CSV/JSON for offline processing.
- Add color mapping options (heat map, radar green, etc.) instead of grayscale.
