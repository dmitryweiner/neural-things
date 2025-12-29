# Ultrasonic Tone Sonogram (19 kHz) — Browser Prototype

This is a **single-page web prototype** that emits short **19 kHz tone bursts** from **one stereo channel** (Left or Right), records the microphone response, measures the **signal energy at the target frequency over time**, and visualizes the result as a **sonogram** where:

- **X axis** ≈ device heading / orientation angle (0–360° mapped across the canvas width)
- **Y axis** ≈ time-of-flight (delay after emission) mapped down the canvas height
- **Brightness** ≈ relative energy at ~19 kHz in that time window

> ⚠️ Practical note: many consumer devices aggressively filter near-ultrasonic frequencies (speakers, microphones, OS processing, echo cancellation, noise suppression, auto gain). Results vary widely between devices.

---

## High-level architecture

The app is intentionally kept as a **single HTML file** with embedded JavaScript. It has three main subsystems:

1. **UI + Control Layer**
   - Reads user parameters (frequency, burst length, listen time, channel, amplitude, analysis window sizes).
   - Provides start/stop/clear/export controls.
   - Shows basic status and sensor readings (sample rate, heading).

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
   - Draws one “column” of the sonogram at the X coordinate derived from device heading.

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
   - The remaining tail buffer represents the “listening” segment.

5. **Compute energy envelope at ~19 kHz**
   - Slice the tail into overlapping frames of `frameSize` samples with hop `hopSize`.
   - For each frame compute single-frequency power using the **Goertzel algorithm**.

6. **Map envelope to sonogram bins**
   - Convert the per-frame power series into `canvas.height` bins using max-downsampling.
   - Normalize by peak power for that burst and apply a mild gamma for contrast.

7. **Draw into the sonogram**
   - Convert heading degrees `0..360` to x-pixel coordinate `0..canvas.width-1`.
   - Draw one vertical column (one pixel wide) at that x coordinate:
     - Top row corresponds to small delay
     - Bottom corresponds to larger delay
   - Brightness corresponds to normalized power at the target frequency.

---

## Orientation / heading subsystem

### How it works
The app uses **device orientation events** rather than a phased array:

- Sensors are **automatically enabled** when the user clicks **Start** (requires user gesture for iOS permission).
- Alternatively, the user can manually tap **"Enable sensors"** before starting.
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

## Visualization model (sonogram)

- The canvas holds an `ImageData` buffer.
- Each scan cycle writes one **vertical column** at the x-position corresponding to heading.
- Color is grayscale:
  - `0` → black
  - `1` → white
- The app renders the full `ImageData` back onto the canvas each cycle.

The sonogram is *not* a true ultrasound B-scan (no real beam forming). It is a **heading-indexed echo intensity map** at a single frequency.

---

## UI controls

- **Start**
  - Automatically enables device orientation sensors (if supported)
  - Initializes AudioContext and microphone stream
  - Starts the scan loop
- **Stop**
  - Stops the scan loop (does not necessarily stop mic stream)
- **Clear**
  - Clears the sonogram image to black
- **Export PNG**
  - Downloads the current canvas as a PNG
- **Enable sensors**
  - Manually requests permission (if required) and starts listening to device orientation
  - Note: this is now called automatically on Start, but the button remains for manual re-enable if needed

Parameters:
- `Frequency (Hz)`: tone frequency (default 19000)
- `Burst duration (ms)`: duration of emitted tone burst
- `Listen after (ms)`: how long to keep recording after emission
- `Channel`: Left or Right speaker output
- `Amplitude`: output volume scalar (use low values)
- `Frame size (samples)`: analysis window size for Goertzel
- `Hop (samples)`: step between frames (overlap)

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

---

## Tips for better results

- Prefer **desktop + external USB audio interface** without “enhancement” processing.
- Reduce background noise and keep the phone/PC still while scanning.
- Keep amplitude low and avoid prolonged high-volume ultrasonic output.
- Try slightly lower frequencies (e.g. **17–18 kHz**) if 19 kHz is filtered out.
- Physically separate the emitting speaker from the mic if possible.

---

## Files

- `index.html` (or any single HTML file)
  - Contains everything: UI, sensors, audio emission, recording, processing, rendering.

---

## Future improvements (ideas)

- Add a **“Set 0°”** calibration button to define a user reference direction.
- Add temporal averaging or max-hold per angle bucket.
- Display approximate range in milliseconds/meters (with a user-configurable speed of sound).
- Replace per-burst normalization with a global rolling normalization for stable brightness.
- Add an FFT-based spectral view for debugging microphone response near 19 kHz.
- Store raw frames and export data as CSV/JSON for offline processing.
