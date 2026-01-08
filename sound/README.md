# Sound Analyzer

**A real-time audio analysis tool with oscilloscope, spectrum analyzer, cepstrum, recurrence plot, and multiscale entropy visualizations.**

Captures audio from your microphone and displays five synchronized visualizations in real-time. Supports WAV recording with configurable audio capture settings.

---

## Features

- **Oscilloscope** — Real-time waveform display with adjustable Y-scale and time window
- **Spectrum Analyzer** — Frequency spectrum in graph or spectrogram (waterfall) mode
- **Cepstrum Analyzer** — Cepstral analysis for pitch detection and periodic structure identification ([Wikipedia](https://en.wikipedia.org/wiki/Cepstrum))
- **Recurrence Plot** — Nonlinear dynamics visualization for detecting recurrent patterns ([Wikipedia](https://en.wikipedia.org/wiki/Recurrence_plot))
- **Multiscale Entropy** — Complexity analysis across multiple time scales ([Wikipedia](https://en.wikipedia.org/wiki/Multiscale_entropy))
- **Peak Detection** — Automatic detection and display of peak values on all graphs (amplitude, frequency, quefrency)
- **Dynamic Axis Labels** — Y-axis labels automatically adjust based on zoom scale
- **WAV Recording** — Record audio directly to WAV format with one click
- **Dynamic Settings** — Configure sample rate, channels, and audio processing based on device capabilities
- **Wake Lock** — Prevents device sleep during audio capture
- **State Persistence** — All visualization settings and panel states are saved to localStorage

---

## Architecture

```
┌─────────────┐
│  Microphone │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ MediaStreamSource│
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────────────────┐
│Analyser│  │ RecorderWorklet  │
└───┬────┘  └────────┬─────────┘
    │                │
    ├────┬────┬────┬─┴────┐
    │    │    │    │      │
    ▼    ▼    ▼    ▼      ▼
┌─────┐ ┌────┐ ┌───┐ ┌──┐ ┌───┐ ┌───┐
│Scope│ │Spec│ │Cep│ │RP│ │MSE│ │WAV│
└─────┘ └────┘ └───┘ └──┘ └───┘ └───┘
```

### Audio Processing

1. **MediaStreamSource** — Captures audio from the microphone via `getUserMedia()`
2. **AnalyserNode** — Provides time-domain and frequency-domain data for visualizations
3. **RecorderWorklet** — AudioWorklet processor that captures raw PCM samples for WAV export

### Cepstrum Calculation

The cepstrum is computed as the inverse FFT of the log magnitude spectrum:

```
Cepstrum = IFFT(log(|FFT(signal)|))
```

The x-axis represents "quefrency" (a time-like dimension). Peaks in the cepstrum indicate periodic structures in the spectrum, making it useful for:
- Pitch detection (fundamental frequency estimation)
- Identifying harmonic patterns
- Echo detection

---

## UI Controls

### Top Bar

| Button | Function |
|--------|----------|
| **▶ Start / ⏹ Stop** | Start or stop audio capture |
| **● Record** | Start/stop WAV recording (auto-starts audio if not running) |
| **⚙ Settings** | Toggle audio capture settings panel |

### Settings Panel

| Setting | Description |
|---------|-------------|
| **Sample Rate** | Audio sample rate (device-dependent options) |
| **Channels** | Mono or Stereo |
| **Echo Cancellation** | Enable browser echo cancellation |
| **Noise Suppression** | Enable browser noise suppression |
| **Auto Gain Control** | Enable automatic gain control |
| **FFT Size** | FFT window size (512–8192, affects frequency resolution) |

### Oscilloscope Controls

| Control | Description | Range |
|---------|-------------|-------|
| **Y Scale** | Vertical amplitude scale | 0.1x – 5x |
| **Time Window** | Number of samples displayed | 128 – 4096 |

### Spectrum Controls

| Control | Description |
|---------|-------------|
| **Graph / Spectrogram** | Toggle between line graph and waterfall display |
| **Y Scale** | Amplitude scale | 0.5x – 3x |
| **Frequency Scale** | Linear or Logarithmic frequency axis |
| **Update Speed** | Spectrogram scroll speed (Slow/Medium/Fast) |

### Cepstrum Controls

| Control | Description |
|---------|-------------|
| **Graph / Spectrogram** | Toggle between line graph and waterfall display |
| **Y Scale** | Amplitude scale | 0.5x – 5x |
| **Quefrency Scale** | Linear or Logarithmic quefrency axis |
| **Update Speed** | Spectrogram scroll speed (Slow/Medium/Fast) |

### Recurrence Plot Controls

| Control | Description | Range |
|---------|-------------|-------|
| **Binary / Colored** | Toggle between binary (threshold) and colored (distance) display |
| **Embedding (m)** | Embedding dimension for state space reconstruction | 2 – 8 |
| **Time delay (τ)** | Time delay between embedding coordinates | 1 – 10 ms |
| **Threshold (ε)** | Percentile threshold for recurrence detection | 5 – 20% |
| **Window size** | Number of samples to analyze | 256 – 1024 |

### Multiscale Entropy Controls

| Control | Description | Range |
|---------|-------------|-------|
| **Perm / Sample** | Entropy type: Permutation or Sample entropy |
| **Max scale (S)** | Maximum coarse-graining scale | 10 – 60 |
| **Window (sec)** | Analysis window duration | 0.5 – 2 sec |
| **Hop (ms)** | Time step between windows | 50 – 200 ms |
| **RMS frame (ms)** | Frame size for RMS envelope calculation | 10 – 30 ms |

---

## Visualization Modes

### Graph Mode (default)

Real-time continuous line graph showing:
- **Spectrum**: Frequency (Hz) on X-axis, amplitude on Y-axis
- **Cepstrum**: Quefrency on X-axis, cepstral coefficient on Y-axis

**Peak Detection**: In graph mode, spectrum and cepstrum automatically detect and display the maximum peak:
- **Spectrum**: Shows frequency of the loudest component (e.g., `440 Hz`)
- **Cepstrum**: Shows quefrency of the dominant periodic component (e.g., `2.3 ms`)

### Spectrogram Mode

Waterfall display where:
- **X-axis**: Time (scrolling left)
- **Y-axis**: Frequency (spectrum) or Quefrency (cepstrum)
- **Color**: Intensity (blue = quiet, red = loud)
- **Y Scale**: Controls the visible frequency/quefrency range (zoom on Y-axis)
  - Higher values (2x, 3x) = zoom in, show lower frequencies in more detail
  - Lower values (0.5x) = zoom out, show wider frequency range

Update speeds:
- **Slow**: ~15 fps
- **Medium**: ~30 fps (default)
- **Fast**: ~60 fps

---

## Recording

1. Click **● Record** to start recording
   - Audio capture starts automatically if not already running
   - Button changes to **⏹ Stop Rec** with pulsing red animation
2. Click **⏹ Stop Rec** to stop and save
   - On mobile: Uses Web Share API for easy sharing
   - On desktop: Auto-downloads the WAV file

**Recording format**: WAV (16-bit PCM, mono)

---

## State Persistence

All visualization settings and panel states are automatically saved to `localStorage` and restored on page reload.

**Storage key**: `sound_analyzer_panels`

**Saved settings**:

| Category | Settings |
|----------|----------|
| **Panels** | Collapse state (expanded/collapsed) for each visualization |
| **Oscilloscope** | Y Scale, Time Window |
| **Spectrum** | Y Scale, Mode (Graph/Spectrogram), Scale (Linear/Log), Speed |
| **Cepstrum** | Y Scale, Mode (Graph/Spectrogram), Scale (Linear/Log), Speed |
| **Recurrence Plot** | Mode (Binary/Colored), Embedding dim, Time delay, Threshold, Window size |
| **Multiscale Entropy** | Mode (Perm/Sample), Max scale, Window size, Hop size, RMS frame |

Settings are saved immediately when changed and restored on page load.

---

## Wake Lock

On supported browsers, the app requests a screen wake lock while audio is running to prevent the device from sleeping. This is automatically released when audio stops.

| Browser | Support |
|---------|---------|
| Chrome/Edge | 84+ |
| Safari (iOS) | 16.4+ |
| Firefox | Not supported |

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome/Edge | 66+ | Fully supported |
| Safari (iOS/macOS) | 14.1+ | Fully supported |
| Firefox | 76+ | Fully supported (no wake lock) |

**Requirements**:
- Microphone access (HTTPS or localhost)
- Web Audio API with AudioWorklet support

---

## Dependencies

No external dependencies. Pure HTML + CSS + JavaScript.

**APIs used**:
- Web Audio API (AnalyserNode, AudioWorklet)
- MediaDevices API (getUserMedia)
- Screen Wake Lock API (optional)
- Web Share API (optional, for mobile recording sharing)
- Canvas 2D for visualizations
- localStorage for state persistence

---

## Technical Notes

### FFT Size vs Resolution

| FFT Size | Frequency Bins | Frequency Resolution @ 48kHz |
|----------|----------------|------------------------------|
| 512 | 256 | ~94 Hz |
| 1024 | 512 | ~47 Hz |
| 2048 | 1024 | ~23 Hz |
| 4096 | 2048 | ~12 Hz |
| 8192 | 4096 | ~6 Hz |

Larger FFT sizes provide better frequency resolution but increased latency.

### Cepstrum Interpretation

- **Low quefrency values** (near 0): Represent the overall spectral envelope
- **Peaks at higher quefrencies**: Indicate periodic components
- **First major peak**: Often corresponds to the fundamental frequency period

For a signal with fundamental frequency f₀, expect a peak at quefrency = 1/f₀ (in samples).

### Recurrence Plot Algorithm

The recurrence plot visualizes recurrent states in a dynamical system:

1. **Preprocessing**: Remove DC offset and normalize signal (std = 1)
2. **Phase space reconstruction**: Build state vectors using time-delay embedding:
   ```
   y_i = [x_i, x_{i+τ}, x_{i+2τ}, ..., x_{i+(m-1)τ}]
   ```
3. **Distance matrix**: Compute Euclidean distances D[i,j] = ||y_i - y_j||
4. **Visualization**:
   - **Binary mode**: R[i,j] = 1 if D[i,j] ≤ ε (threshold), else 0
   - **Colored mode**: Intensity = exp(-D/σ) for distance-based coloring

**Interpretation**:
- **Diagonal lines**: Indicate similar evolution of states over time (determinism)
- **Vertical/horizontal lines**: Indicate laminar states (stationarity)
- **Isolated points**: Indicate stochastic or chaotic behavior

### Multiscale Entropy Algorithm

Multiscale entropy (MSE) quantifies signal complexity across different time scales:

1. **RMS Envelope**: Convert raw signal to energy envelope using RMS over short frames
2. **Normalization**: Center and scale envelope to unit variance
3. **Coarse-graining**: For each scale s, compute averaged series:
   ```
   y^(s)[k] = mean(x[k·s : k·s + s])
   ```
4. **Permutation Entropy**: For each coarse-grained series, count ordinal patterns:
   - Extract overlapping vectors of length m (embedding dimension)
   - Map each vector to its ordinal pattern (rank order)
   - Compute Shannon entropy of pattern distribution
   - Normalize by log₂(m!) for range [0, 1]

**Interpretation**:
- **High entropy** (yellow/red): Complex, irregular patterns
- **Low entropy** (blue): Regular, predictable patterns
- **Scale dependency**: How complexity changes with temporal granularity
- **White noise**: High entropy at all scales
- **Periodic signals**: Low entropy at all scales

---

## Changelog

### 2026-01-08 (v1.2)

- Added **Recurrence Plot** visualization for nonlinear dynamics analysis
  - Binary and colored display modes
  - Configurable embedding dimension, time delay, and threshold
  - Real-time updates (~10 fps)
- Added **Multiscale Entropy** heatmap visualization
  - Permutation entropy computation across multiple scales
  - Configurable window size, hop size, and RMS frame parameters
  - Time-scale heatmap display
- Added Wikipedia reference links [?] for Cepstrum, Recurrence Plot, and Multiscale Entropy
- Extended state persistence for all new panel settings

### 2025-12-31 (v1.1)

- Increased font size on graph labels (2x larger for better readability)
- Dynamic Y-axis labels that update based on zoom scale
- Peak detection with labels for Spectrum (frequency Hz) and Cepstrum (quefrency ms)
- Extended state persistence to save all visualization settings (not just panel collapse states)
- Y Scale in spectrogram mode now controls frequency/quefrency zoom (range on Y-axis)

### 2025-12-31 (v1.0)

- Initial release
- Oscilloscope with Y-scale and time window controls
- Spectrum analyzer with graph and spectrogram modes
- Cepstrum analyzer with graph and spectrogram modes
- WAV recording with auto-start
- Dynamic audio capture settings
- Wake lock support
- Panel state persistence

