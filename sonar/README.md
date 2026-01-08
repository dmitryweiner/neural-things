# Ultrasonic Tone Sonogram (19 kHz) — Browser Prototype

This is a **single-page web prototype** that emits short **19 kHz tone bursts** from **one stereo channel** (Left or Right), records the microphone response, and uses **cepstrum analysis** to detect echo time-of-flight. The result is visualized as a **rotating polar sonogram** where:

- **Current direction** is always at top (green line points up)
- **Sonogram rotates** as you turn the device, keeping your facing direction at 12 o'clock
- **Radius** = physical distance (center = min distance, edge = max distance)
- **Brightness** = cepstrum magnitude (peaks indicate echo reflections)

> ⚠️ Practical note: many consumer devices aggressively filter near-ultrasonic frequencies (speakers, microphones, OS processing, echo cancellation, noise suppression, auto gain). Results vary widely between devices.

---

## High-level architecture

The app is intentionally kept as a **single HTML file** with embedded JavaScript. It has five main subsystems:

1. **UI + Control Layer**
   - Sticky top bar with main control buttons (Start/Stop toggle, Export PNG, Calibrate).
   - Clear button overlaid on the sonogram canvas (top-right corner) for quick access.
   - Collapsible settings panel with slider-based parameters (frequency, burst length, listen time, channel, amplitude, distance limits, bandpass width).
   - Each slider has +/- buttons for fine adjustment with hold-to-repeat behavior.
   - Collapsible info panel showing status, sensor readings (sample rate, heading), Wake Lock status, and real-time cepstrum chart.
   - **Cepstrum chart**: displays current angle's cepstrum magnitude vs distance (X = distance in meters, Y = magnitude). Peaks are highlighted as potential echo candidates.

2. **Audio I/O Layer (Web Audio API)**
   - Creates an `AudioContext`.
   - Plays a tone burst through the selected stereo channel (Left or Right).
   - Captures microphone audio in real time using either:
     - `AudioWorkletNode` (preferred), or
     - `ScriptProcessorNode` (fallback).

3. **Signal Processing Layer (Cepstrum Analysis)**
   - After each emission, records a short microphone window (burst + listening interval).
   - Skips most of the direct emission portion to reduce immediate leakage.
   - Computes the **real cepstrum** with bandpass filtering around the ping frequency.
   - Converts quefrency to physical distance using speed of sound.
   - Applies temporal sliding mean subtraction for stability.
   - Stores normalized cepstrum data in a polar data structure `polarData[angle][radius]`.

4. **Device Management Layer**
   - Handles device orientation events for heading.
   - Manages Wake Lock API to prevent screen sleep during scanning.

5. **Calibration System**
   - Automated parameter sweep for finding optimal settings on a specific device.
   - Tests combinations of frequency, burst duration, listen time, frame size, hop size, and channel.
   - Exports detailed JSON measurements for analysis.

---

## Cepstrum-based echo detection

### What is cepstrum?

The **cepstrum** is the inverse Fourier transform of the log magnitude spectrum. It reveals periodicities in the frequency domain, which correspond to echoes in the time domain. The x-axis of the cepstrum is called **quefrency** (an anagram of "frequency") and has units of time.

### Why cepstrum for echo detection?

1. **Direct time-of-flight**: Peaks in the cepstrum directly indicate round-trip delays of echoes.
2. **Frequency isolation**: By bandpass filtering around the ping frequency before computing the cepstrum, we focus on the ultrasonic signal and reject noise.
3. **Echo separation**: Multiple echoes at different distances appear as separate peaks at different quefrencies.

### Signal processing pipeline

```
Mic Signal → Hann Window → FFT → Bandpass Filter → log|spectrum| → IFFT → Cepstrum
                                     ↓
                          (around ping freq ± bandwidth)
```

After obtaining the cepstrum:
1. **Quefrency filtering**: Only consider quefrencies corresponding to physical distances between `minDist` and `maxDist`.
2. **Temporal sliding mean subtraction**: Subtract the rolling average of recent cepstrum frames to remove stationary components (consistent leakage patterns).
3. **Normalization**: Apply sqrt compression for better visualization.

### Distance calculation

The quefrency-to-distance conversion uses:

```
distance = (speed_of_sound × quefrency) / 2
```

The division by 2 accounts for the round-trip (sound travels to object and back).

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

5. **Compute real cepstrum**
   - Apply Hann window to the tail signal.
   - Zero-pad to next power of 2.
   - Compute FFT to get spectrum.
   - Apply bandpass filter around `pingFreq ± bandwidth` Hz.
   - Take log of magnitude spectrum (with epsilon to avoid log(0)).
   - Compute IFFT to get real cepstrum.

6. **Convert to distance bins**
   - Map quefrency range (corresponding to `minDist` to `maxDist`) to 256 radius bins.
   - Take absolute value of cepstrum values (cepstrum can be negative).

7. **Apply temporal sliding mean subtraction**
   - For each angle bucket, maintain a circular buffer of the last 5 cepstrum frames.
   - Compute the rolling mean and partially subtract it from the current frame.
   - This removes stationary components that appear consistently (like speaker-to-mic leakage).

8. **Store in polar data structure**
   - Map the heading angle to one of 360 buckets (1° resolution).
   - Store normalized cepstrum values in `polarData[angle][radius]`.

9. **Render polar sonogram**
   - For each pixel on the square canvas, compute its polar coordinates (angle, radius).
   - Apply rotation offset so current heading appears at top (0° screen position).
   - Look up the corresponding cepstrum magnitude from `polarData`.
   - Draw grayscale pixel (brighter = stronger cepstrum peak = potential echo).
   - Overlay reference circles and cardinal lines.
   - Draw a green line from center to top edge (current direction always up).

---

## Polar visualization model

The sonogram uses a **rotating polar coordinate system** rendered on a square canvas:

- **Center** = minimum distance (closest detectable echo)
- **Edge** = maximum distance (furthest detectable echo)
- **Top (0°)** = current device facing direction (always)
- **Brightness** = normalized cepstrum magnitude

### Rotation behavior

Unlike traditional radar displays where the sweep rotates and data stays fixed, this sonogram rotates the **data** so the current facing direction is always at the top. This creates a "what's in front of me" view:

- As you rotate the device, the entire sonogram image rotates beneath the fixed green direction line
- The green line always points up (12 o'clock position)
- Objects that were to your left appear on the left, objects ahead appear at the top

Visual elements:
- **Grayscale data**: each pixel's brightness corresponds to cepstrum magnitude at that angle/distance
- **Reference circles**: concentric circles at 25%, 50%, 75% of max radius
- **Cardinal lines**: horizontal and vertical lines through center
- **Green direction line**: fixed at top, shows current facing direction

Data storage:
- `polarData[360][256]` — 360 angle buckets (1° each) × 256 radius bins
- Updated incrementally as the device rotates
- Rendered with rotation offset based on current heading

This representation keeps your current direction always visible at the top, making it intuitive to understand "what's ahead" vs "what's behind".

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

## Signal processing details

### FFT Implementation

The app includes a pure JavaScript implementation of the radix-2 Cooley-Tukey FFT algorithm:

- **Bit-reversal permutation**: Reorders input for in-place computation
- **Butterfly operations**: Iteratively combines frequency components
- **IFFT via conjugate trick**: `IFFT(x) = conj(FFT(conj(x))) / N`

### Real Cepstrum Computation

```javascript
function computeRealCepstrum(signal, sampleRate, pingFreq, bandwidthHz) {
  // 1. Apply Hann window to reduce spectral leakage
  // 2. Zero-pad to next power of 2
  // 3. FFT to get complex spectrum
  // 4. Compute magnitude spectrum
  // 5. Apply bandpass filter (zero out bins outside pingFreq ± bandwidth)
  // 6. Take log of magnitude (with epsilon for numerical stability)
  // 7. IFFT to get real cepstrum
  // 8. Return cepstrum array (index = quefrency in samples)
}
```

### Quefrency to Distance Mapping

```javascript
function cepstrumToDistanceBins(cepstrum, sampleRate, speedOfSound, minDist, maxDist, numBins) {
  // Convert distance to quefrency:
  // quefrencySamples = (2 × distance / speedOfSound) × sampleRate
  
  // Map minDist..maxDist to quefrency range
  // Sample cepstrum at evenly spaced distance intervals
  // Take absolute value (cepstrum can be negative)
}
```

### Temporal Sliding Mean Subtraction

To improve stability and remove consistent leakage patterns:

```javascript
// Per-angle circular buffer of recent cepstrum frames
const CEPSTRUM_HISTORY_SIZE = 5;

function applySlidingMeanSubtraction(angleBucket, newBins) {
  // Store new frame in circular buffer
  // Compute mean across recent frames
  // Subtract 80% of mean from current frame
  // Rectify (keep positive values only)
  // Normalize with sqrt compression
}
```

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
  - Opens/closes the system info panel (status, sample rate, heading, wake lock, cepstrum chart)
- **📐 Calibrate**
  - Runs automated parameter sweep for device-specific calibration (see Calibration section)

### Sonogram canvas overlay

- **Clear** (button in top-right corner of the sonogram)
  - Clears the polar sonogram data and cepstrum history
  - Positioned directly on the canvas for quick access during scanning

### Settings panel (collapsible)

All numeric parameters use sliders with +/- fine adjustment buttons:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Frequency (Hz) | 16000–20000 | 19000 | Tone frequency for ping |
| Burst duration (ms) | 1–40 | 8 | Duration of emitted tone burst |
| Listen after (ms) | 5–250 | 80 | How long to keep recording after emission |
| Output channel | L/R | Right | Left or Right speaker output |
| Amplitude | 0.01–1 | 0.18 | Output volume scalar (use low values) |
| Speed of sound (m/s) | 300–400 | 343 | For distance calculation (adjust for temperature) |
| Min distance (m) | 0.05–1.0 | 0.15 | Skip direct leakage at very short delays |
| Max distance (m) | 1–20 | 10 | Physical plausibility limit |
| Bandpass width (Hz) | 500–5000 | 2000 | Filter width around ping frequency |

The +/- buttons support hold-to-repeat for continuous adjustment.

### Live parameter updates

All settings can be changed **while the scan is running**:

- Parameter changes are applied with a short debounce delay (~250 ms) to avoid excessive updates during slider dragging.
- When frequency or burst duration changes, the tone buffer is automatically regenerated.
- Previously collected polar data is preserved — useful for comparing different frequency responses without losing existing measurements.

---

## Calibration

The **📐 Calibrate** button runs an automated parameter sweep to find optimal settings for your specific device. This is useful because different phones/computers have vastly different speaker and microphone frequency responses.

### How to use

1. Stop any active scanning
2. Place the device **1 meter from a flat wall** (or other reflective surface)
3. Click **Calibrate**
4. Wait for the sweep to complete (~540 combinations, takes ~5-7 minutes)
5. A JSON file will be downloaded with all measurements

### What it tests

The calibration iterates through all combinations of (~540 total):

| Parameter | Values tested |
|-----------|---------------|
| Frequency | 17000, 17500, 18000, 18500, 19000 Hz |
| Burst duration | 4, 8, 12 ms |
| Listen time | 30, 50, 80 ms |
| Frame size | 256, 512, 1024 samples |
| Hop size | 128, 256 samples |
| Channel | Left, Right |

For each combination, **3 measurements** are taken and averaged.

### JSON output format

```json
{
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 ...",
    "sampleRate": 48000,
    "timestamp": "2025-12-29T12:00:00.000Z",
    "platform": "iPhone"
  },
  "targetDistance": 1.0,
  "measurements": [
    {
      "params": {
        "frequency": 19000,
        "burstMs": 6,
        "listenMs": 50,
        "frameSize": 512,
        "hopSize": 128,
        "channel": "L"
      },
      "results": {
        "iterations": 3,
        "powers": [0.12, 0.14, 0.11],
        "meanPower": 0.123,
        "peakBin": 45,
        "peakTimeMs": 5.7,
        "snr": 12.5
      }
    }
  ]
}
```

### Analyzing results

The JSON can be analyzed to find:
- **Best frequency**: which ultrasonic frequency passes through the device's audio path
- **Optimal timing**: burst/listen durations that capture reflections cleanly
- **Best channel**: left vs right speaker may have different responses
- **SNR patterns**: signal-to-noise ratio indicates detection reliability

#### Built-in analysis function

The app includes a built-in analysis function that can be used from the browser console:

```javascript
// Method 1: Load and analyze a JSON file
analyzeCalibrationFile();  // Opens file picker, then analyzes the selected file

// Method 2: Analyze data already in memory
const data = { /* your calibration JSON */ };
const results = analyzeCalibrationData(data);
console.log(results.recommended.params);  // Best parameters
```

The analysis function:
- Scores each parameter combination based on SNR, power, time-of-flight accuracy, and stability
- Returns top 20 results sorted by score
- Groups results by frequency and channel
- Recommends optimal parameters for the device

> **Note**: The default parameters in the app have been optimized based on calibration data analysis. For a typical Android device, the best settings are: **19000 Hz, Right channel, 8 ms burst, 80 ms listen**. These defaults provide the best SNR (~13.7) and signal clarity for 1-meter distance measurements.

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
- Adjust **min distance** to skip consistent leakage patterns.
- Adjust **speed of sound** for temperature (343 m/s at 20°C, ~331 m/s at 0°C, ~355 m/s at 35°C).

---

## Files

- `index.html` (or any single HTML file)
  - Contains everything: UI, sensors, audio emission, recording, cepstrum processing, polar rendering.

---

## Future improvements (ideas)

- Add peak detection with distance labels on the sonogram.
- Add color mapping options (heat map, radar green, etc.) instead of grayscale.
- Auto-apply optimal parameters after calibration based on analysis.
- Add multi-frequency chirp for improved range resolution.
- Add spectrogram view for debugging frequency response.
