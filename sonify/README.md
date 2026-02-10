# Sonify — Camera to Sound

A single-page web app that turns your phone's camera image into sound in real time.
No backend required — everything runs in the browser using Web Audio API and AudioWorklet.

## Two Modes

### Mode 1: Path Scan

The camera frame is converted to grayscale. A virtual cursor traverses every pixel
along a chosen path (raster or Hilbert curve) and reads the brightness value.
The stream of brightness values becomes an audio signal after high-pass filtering,
automatic gain control, and soft clipping.

- **Raster** — scans left-to-right, top-to-bottom (simple, row-by-row).
- **Hilbert curve** — a space-filling curve that preserves spatial locality,
  producing a smoother, more coherent sound.

The scan speed controls how many pixels per second the cursor advances,
which directly affects the pitch and texture of the output.

### Mode 2: Spectrogram Inversion

The camera frame is interpreted as a spectrogram:

- **X axis** = time frames
- **Y axis** = frequency bins (low frequencies at the bottom)
- **Brightness** = amplitude (mapped through a dB range and gamma curve)

The app synthesizes audio by running an inverse Short-Time Fourier Transform (iSTFT)
with random phase. The result sounds noise-like but is shaped by the image.

Press **Refine** to run 8 iterations of the Griffin-Lim algorithm,
which progressively recovers a more natural phase structure from the amplitude-only
spectrogram, producing a cleaner reconstruction with each press.

## Controls

| Control | Mode | Description |
|---------|------|-------------|
| **Start / Stop Camera** | Both | Opens the rear camera and begins capturing frames to a 256×256 canvas |
| **Start / Stop Audio** | Both | Creates the AudioContext and starts feeding samples to the speaker |
| **Mode selector** | — | Switch between Path Scan and Spectrogram Inversion |
| **Freeze / Render** | Spec | Captures the current frame, builds the amplitude matrix, and synthesizes audio via iSTFT |
| **Refine (GL ×8)** | Spec | Runs 8 Griffin-Lim iterations on the frozen frame for cleaner phase recovery |
| **Loop** | Spec | Loops the synthesized spectrogram audio continuously |
| **Path** | Scan | Raster or Hilbert curve |
| **Pre-blur** | Scan | Applies a 3×3 box blur to reduce pixel noise |
| **Scan speed** | Scan | Pixels per second (affects pitch / texture) |
| **HPF** | Scan | High-pass filter coefficient (higher = more DC removal) |
| **AGC strength** | Scan | Automatic gain control mix (0 = off, 1 = full) |
| **Drive** | Scan | Pre-clip gain multiplier |
| **nFFT** | Spec | FFT size: 512 (fast) or 1024 (better frequency resolution) |
| **Range dB** | Spec | Dynamic range mapping for brightness → amplitude |
| **Gamma** | Spec | Power curve applied to brightness before dB mapping |

## Browser Requirements

- **getUserMedia** — camera access (requires HTTPS or localhost)
- **AudioWorklet** — low-latency audio processing
- **Screen Wake Lock API** — keeps the screen on during playback (optional, gracefully degrades)

Tested on Safari (iOS 16+) and Chrome (Android / desktop).

## How to Run

The app is a static single-file HTML page. Serve it over HTTPS (required for camera access):

```bash
# From the repository root
npx serve .
# Then open https://localhost:3000/sonify/
```

Or use any local HTTPS server (e.g., `python -m http.server` behind an HTTPS proxy,
VS Code Live Server with HTTPS, etc.).

On a phone, open the URL in Safari or Chrome, grant camera permission,
tap **Start Camera**, then **Start Audio**.
