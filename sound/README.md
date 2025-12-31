# Sound Analyzer

**A real-time audio analysis tool with oscilloscope, spectrum analyzer, and cepstrum visualization.**

Captures audio from your microphone and displays three synchronized visualizations in real-time. Supports WAV recording with configurable audio capture settings.

---

## Features

- **Oscilloscope** — Real-time waveform display with adjustable Y-scale and time window
- **Spectrum Analyzer** — Frequency spectrum in graph or spectrogram (waterfall) mode
- **Cepstrum Analyzer** — Cepstral analysis for pitch detection and periodic structure identification
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
    ├────────┬───────┤
    │        │       │
    ▼        ▼       ▼
┌─────┐  ┌──────┐  ┌───────┐  ┌─────┐
│Scope│  │Spec  │  │Cepstr │  │ WAV │
└─────┘  └──────┘  └───────┘  └─────┘
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

---

## Visualization Modes

### Graph Mode (default)

Real-time continuous line graph showing:
- **Spectrum**: Frequency (Hz) on X-axis, amplitude on Y-axis
- **Cepstrum**: Quefrency on X-axis, cepstral coefficient on Y-axis

**Peak Detection**: In graph mode, each visualization automatically detects and displays the maximum peak:
- **Oscilloscope**: Shows peak amplitude value (e.g., `Peak: +0.75`)
- **Spectrum**: Shows frequency of the loudest component (e.g., `440 Hz`)
- **Cepstrum**: Shows quefrency of the dominant periodic component (e.g., `2.3 ms`)

### Spectrogram Mode

Waterfall display where:
- **X-axis**: Time (scrolling left)
- **Y-axis**: Frequency (spectrum) or Quefrency (cepstrum)
- **Color**: Intensity (blue = quiet, red = loud)

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

---

## Changelog

### 2025-12-31 (v1.1)

- Increased font size on graph labels (2x larger for better readability)
- Dynamic Y-axis labels that update based on zoom scale
- Peak detection with labels for all graphs (Oscilloscope: amplitude, Spectrum: frequency Hz, Cepstrum: quefrency ms)
- Extended state persistence to save all visualization settings (not just panel collapse states)

### 2025-12-31 (v1.0)

- Initial release
- Oscilloscope with Y-scale and time window controls
- Spectrum analyzer with graph and spectrogram modes
- Cepstrum analyzer with graph and spectrogram modes
- WAV recording with auto-start
- Dynamic audio capture settings
- Wake lock support
- Panel state persistence

