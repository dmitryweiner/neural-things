# Formula Audio Lab

**A web application for sound synthesis based on mathematical formulas.**

An interactive audio laboratory where sound is generated in real-time via the AudioWorklet API. Each generator is a mathematical formula turned into a sound wave.

---

## Architecture

### Audio Graph

```text
[Generators] → [MixBus] → [FX Input] → [Filter?] → [Chorus?] → [Reverb?] → [Limiter?] → [MasterGain] → [Analyser] → [Destination]
                                                                                              ↓
                                                                                      [MediaStreamDest] → Recording
```

- **AudioWorklet** (`FormulaGeneratorProcessor`) — sample generation in a separate audio thread
- **MixBus** — summing all active generators
- **Effects** — optional effects chain (each can be toggled on/off)
- **Analyser** — data for the oscilloscope

### UI State

All state is serialized to JSON:
- Saving to `localStorage` (button "Save preset")
- Encoding to URL hash via base64url (button "Share")
- Auto-loading from URL when opening the page

---

## Generators (Formulas)

Each generator can be enabled independently (checkbox), parameters are adjusted with sliders.

### 1. FM Sine (`fm`)
**Formula:** `sin(2π·fc·t + I·sin(2π·fm·t))`

Frequency modulation. Carrier frequency `fc` is modulated by a sinusoid `fm` with modulation index `I`.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `fc` | Carrier frequency (Hz) | 20–2000 |
| `fm` | Modulator frequency (Hz) | 0.1–60 |
| `I` | Modulation index | 0–20 |

---

### 2. AM / Beats (`am`)
**Formula:** `sin(2π·f1·t) · sin(2π·f2·t)`

Amplitude modulation / multiplication of two sinusoids.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `f1` | First frequency (Hz) | 20–2000 |
| `f2` | Second frequency (Hz) | 20–2000 |

---

### 3. Logistic Map (`logistic`)
**Formula:** `x_{n+1} = r·x_n·(1 - x_n)`

A chaotic system. The value `x` controls the frequency of the sinusoid.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `base` | Base frequency (Hz) | 20–800 |
| `depth` | Modulation depth (Hz) | 0–1200 |
| `r` | Chaos parameter | 2.8–4.0 |
| `lfoHz` | Update rate of x | 1–400 |

**Note:** At `r < 3` — stable, at `r ≈ 3.57` — period-doubling, at `r > 3.57` — chaos.

---

### 4. Exponential Glissando (`gliss`)
**Formula:** `f(t) = f0 · e^(k·t)`

Frequency exponentially rises or falls over time.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `f0` | Initial frequency (Hz) | 10–400 |
| `k` | Rate of change | -2.0–2.0 |

**Note:** Use "Reset state" to restart from the beginning.

---

### 5. Harmonic Sum (`additive`)
**Formula:** `Σ (1/k)·sin(move·t + k) · sin(2π·k·fund·t)`

Additive synthesis with moving harmonic amplitudes.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `fund` | Fundamental frequency (Hz) | 20–500 |
| `N` | Number of harmonics | 1–40 |
| `move` | Amplitude movement speed (Hz) | 0.01–5 |

---

### 6. Phase Modulation (`pm`)
**Formula:** `sin(2π·f·t + 5·sin(sin(2π·f2·t)))`

Phase is modulated by nested sines.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `f` | Carrier frequency (Hz) | 20–2000 |
| `f2pm` | Modulator frequency (Hz) | 0.1–40 |

**Note:** Use "Reset state" to reset phase.

---

### 7. Two Sines — Beats (`beats`)
**Formula:** `0.5·(sin(2π·f·t) + sin(2π·(f + Δf)·t))`

Classic beats — interference of two close frequencies.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `fbeat` | Base frequency (Hz) | 20–2000 |
| `df` | Frequency difference Δf (Hz) | 0–20 |

**Note:** Beat frequency = `Δf` Hz.

---

### 8. Nonlinear Saturation (`dist`)
**Formula:** `tanh(α · sin(2π·f·t))`

Soft clipping via hyperbolic tangent — adds harmonics.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `fd` | Frequency (Hz) | 20–2000 |
| `alpha` | Distortion amount | 0–10 |

---

### 9. Quasi-random LFO (`quasi`)
**Formula:** `f(t) = fq + Aq · sin(sin(sin(w·t)))`

Frequency is modulated by triple-nested sin — produces pseudo-random behavior.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `fq` | Base frequency (Hz) | 20–500 |
| `Aq` | Depth (Hz) | 0–1200 |
| `wq` | Speed w | 0.05–6 |

**Note:** Use "Reset state" to reset phase.

---

### 10. Lorenz Attractor (`lorenz`)
**Formula:** Lorenz ODE system → freq/amp

```text
dx/dt = σ(y - x)
dy/dt = x(ρ - z) - y  
dz/dt = xy - βz
```

Attractor coordinates are mapped to frequency and amplitude.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `sigma` | σ | 0–30 |
| `rho` | ρ | 0–60 |
| `beta` | β | 0.1–10 |
| `lBase` | Base frequency (Hz) | 20–400 |
| `lFreqScale` | Frequency scale | 0–200 |
| `lAmp` | Amplitude scale | 0–1 |

**Classic values:** σ=10, ρ=28, β=8/3 ≈ 2.667

**Note:** Use "Reset state" to reset attractor state.

---

### 11. Karplus–Strong (`karplus`)
**Formula:** `noise → delay line → averaging → feedback`

Physical modeling of a string.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `ksFreq` | Note frequency (Hz) | 40–880 |
| `ksDamp` | Damping | 0.90–0.9999 |
| `ksBright` | Brightness (filter balance) | 0–1 |

**Note:** "Reset state" — pluck the string again.

---

### 12. Bitcrusher / Downsample (`bitcrush`)
**Formula:** `quantize(sin(phase), bits) + sample_hold(down)`

Lo-Fi effect: bit depth and sample rate reduction.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `bcFreq` | Input frequency (Hz) | 20–2000 |
| `bcBits` | Bit depth | 1–16 |
| `bcDown` | Downsampling (divider) | 1–64 |

---

### 13. Noise → Low-pass (`noiselp`)
**Formula:** `white_noise → 1-pole LP filter`

Filtered white noise.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `nCut` | Cutoff frequency (Hz) | 20–18000 |

---

### 14. Pink Noise (`pinknoise`)
**Formula:** Paul Kellet's 1/f approximation

Natural noise with 1/f spectrum — amplitude is inversely proportional to frequency. Often used for relaxation and acoustic testing.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `pinkBright` | Brightness (white noise mix) | 0–1 |

---

### 15. Brown Noise (`brownnoise`)
**Formula:** `x[n] = clamp(x[n-1] + noise * step, -1, 1)`

Brownian (red) noise — random walk. Deep low-frequency rumble, reminiscent of ocean roar.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `brownStep` | Walk step size | 0.001–0.1 |

---

### 16. Velvet Noise (`velvetnoise`)
**Formula:** sparse impulses (+1 or -1)

Sparse random impulses. Textured clicking sound, used for decorrelation and special effects.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `velvetDensity` | Impulse density (imp/s) | 100–10000 |

---

### 17. Rossler Attractor (`rossler`)
**Formula:** Rossler ODE system

```text
dx/dt = -y - z
dy/dt = x + a·y
dz/dt = b + z·(x - c)
```

A chaotic system, similar to Lorenz, but with different motion characteristics.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `rossA` | Parameter a | 0.01–0.5 |
| `rossB` | Parameter b | 0.01–0.5 |
| `rossC` | Parameter c | 2–12 |
| `rossBase` | Base frequency (Hz) | 20–400 |
| `rossFreqScale` | Frequency scale | 0–100 |
| `rossAmp` | Amplitude scale | 0–1 |

**Classic values:** a=0.2, b=0.2, c=5.7

**Note:** Use "Reset state" to reset attractor state.

---

### 18. Shepard Tone (`shepard`)
**Formula:** `Σ envelope(k) · sin(2π · f0 · 2^(k+t) · t)`

A mesmerizing auditory illusion of endless rising (or falling). Multiple octaves of sinusoids with a Gaussian envelope over frequency.

| Parameter | Description | Range |
|-----------|-------------|-------|
| `shepBase` | Base frequency (Hz) | 20–200 |
| `shepSpeed` | Rise speed (negative = descent) | -0.5–0.5 |
| `shepOctaves` | Number of octaves | 3–10 |

**Note:** Use "Reset state" to restart the illusion.

---

## Effects

The "Effects" panel opens with a button in the top bar. Each effect is enabled with an "ON" checkbox.

### Filter (Biquad)
Standard Web Audio API biquad filter.

| Parameter | Description |
|-----------|-------------|
| Type | low-pass / high-pass / band-pass |
| Cutoff | Cutoff frequency (20–18000 Hz) |
| Q | Quality factor (0.1–30) |

### Chorus / Flanger
Modulated delay with feedback.

| Parameter | Description |
|-----------|-------------|
| Mode | chorus (base 12ms) / flanger (base 2ms) |
| Rate | LFO frequency (0.01–8 Hz) |
| Depth | Modulation depth (0–20 ms) |
| Mix | Dry/wet balance (0–1) |
| Feedback | Feedback amount (0–0.95) |

### Reverb (Convolver)
Convolution reverb with procedural impulse response.

| Parameter | Description |
|-----------|-------------|
| Decay | Decay time (0.1–8 s) |
| Mix | Dry/wet balance (0–1) |

### Limiter
Dynamic compressor in limiter mode (ratio=20).

| Parameter | Description |
|-----------|-------------|
| Threshold | Threshold (dB) (-40–0) |
| Release | Release time (0.02–1 s) |

### Delay / Echo
Classic delay with feedback for creating echoes.

| Parameter | Description |
|-----------|-------------|
| Time | Delay time (0.05–2.0 s) |
| Feedback | Feedback amount (0–0.9) |
| Mix | Dry/wet balance (0–1) |

### Phaser
Phase effect via chain of all-pass filters with LFO modulation.

| Parameter | Description |
|-----------|-------------|
| Rate | LFO frequency (0.1–10 Hz) |
| Depth | Modulation depth (0–1) |
| Stages | Number of filters (2, 4, 6, 8) |
| Feedback | Feedback amount (0–0.9) |
| Mix | Dry/wet balance (0–1) |

---

## UI Elements

### Top Bar
- **Status** — displayed to the right of the title in gray text
- **▶ Play / ⏹ Stop** — single button for starting and stopping audio (green in Play mode, red in Stop mode)
- **Record** — record audio to WAV format (button highlights red during recording)
- **Save preset** — to localStorage
- **Load preset** — from localStorage
- **Share** — copies URL with state to clipboard
- **📊** — show/hide oscilloscope (button highlights when oscilloscope is visible)
- **🎛** — open/close effects panel (button highlights when panel is open)

**Button grouping on mobile:**
Buttons are divided into logical groups with visual separators:
1. Playback controls: Play/Stop, Record
2. Preset management: Save, Load, Share
3. Panels: 📊 (Scope), 🎛 (Effects)

### Auto-start Audio
When enabling any formula (clicking checkbox) audio automatically starts if not already running. This eliminates the need to press Play first.

### Oscilloscope with Spectrogram
- **Spectrogram (waterfall)** — background display of frequency spectrum, scrolling right
  - Palette from blue (quiet) to red (loud)
  - Low frequencies at bottom, high at top
- **Grid** — overlaid on spectrogram for easy orientation
- **Waveform** — signal waveform drawn on top of everything
- Auto-scaling on Y axis
- Spans full screen width
- Collapses with 📊 button in top bar
- When collapsed — panel is completely hidden (takes no space)
- When hidden, drawing stops to save CPU
- Automatically hides when effects panel opens
- Collapsed by default on mobile

### Effects Panel
- Opens with 🎛 button
- Has scrolling when content overflows (max-height: 60vh)
- Automatically hides oscilloscope when opened

### Formula Cards
- **Disable all** — disables all formulas at once
- **▼ Collapse all / ▶ Expand all** — collapses/expands all formulas for compact view
- Checkbox — enable/disable generator (auto-starts audio on first enable)
- **Active formula highlighting** — enabled generators are marked with green border on left
- **▼ / ▶** — collapse/expand formula sliders
- **+/− buttons** — next to each slider for precise one-step adjustment
- "Reset state" — resets internal state (only for: Gliss, PM, Quasi, Lorenz, Karplus-Strong)

---

## Technical Details

### AudioWorklet Processor

```javascript
class FormulaGeneratorProcessor extends AudioWorkletProcessor {
  // Sample generation in process()
  // Communication via port.postMessage({type: 'set'|'reset', params})
}
```

### State

```javascript
{
  v: 2,                    // format version
  masterGain: 0.25,
  scopeCollapsed: false,
  fx: {
    panelOpen: false,
    filterOn: false, filterType: 'lowpass', filterFreq: 12000, filterQ: 0.7,
    chorusOn: false, chorusMode: 'chorus', chorusRate: 0.35, ...
    reverbOn: false, reverbDecay: 2.8, reverbMix: 0.25,
    limiterOn: false, limiterThr: -12, limiterRel: 0.15,
    delayOn: false, delayTime: 0.35, delayFb: 0.4, delayMix: 0.3,
    phaserOn: false, phaserRate: 0.5, phaserDepth: 0.7, phaserStages: 4, ...
  },
  formulas: {
    fm: { enabled: false, collapsed: false, params: { gain: 0.15, fc: 220, ... } },
    am: { ... },
    pinknoise: { ... },
    shepard: { ... },
    ...
  }
}
```

### URL Sharing
State is encoded in base64url and added to hash:

```text
https://.../#s=eyJ2IjoyLCJtYXN0ZXJHYWluIjowLjI1LC4uLn0
```

---

## Usage Tips

1. **Always start with low Gain** — some formulas can produce loud output
2. **Use Limiter** when experimenting with chaos (Lorenz, Rossler, Logistic)
3. **Combine generators** — enable several simultaneously
4. **Reset state** — available for 7 formulas: Gliss, PM, Quasi, Lorenz, Karplus-Strong, Rossler, Shepard
   - For Karplus-Strong this is "plucking" the string again
   - For Gliss — start from f0
   - For Lorenz/Rossler — reset attractor state
   - For Shepard — restart illusion from beginning
5. **Disable all** — quick way to disable all generators
6. **Noises** — three types of noise for different purposes:
   - Pink noise — pleasant for relaxation
   - Brown noise — deep rumble
   - Velvet noise — textured, clicking
7. **Shepard Tone** — try negative speed for endless falling illusion
8. **Delay + Phaser** — combine well with Chorus for rich sound
9. **Recording** — use Record to save interesting sounds
   - Recording format: WAV (16-bit PCM) — plays everywhere
   - On mobile devices: uses Web Share API for convenient file sharing
   - If automatic download doesn't work — click the "Download" link in status

---

## iOS Specifics

Safari on iOS has an autoplay policy that requires special handling of Web Audio API:

- **AudioContext** may start in `suspended` state even after creation on user click
- In this state, the audio graph processes data (oscilloscope shows signal), but sound is not output to speakers
- The app automatically calls `resume()` on start for correct iOS operation

**For users:** Press the "▶ Play" button or enable any formula — sound will activate automatically.

---

## Preventing Sleep Mode (Wake Lock)

On mobile devices, the screen may automatically turn off after some inactivity. To prevent this during audio playback, the app uses **Screen Wake Lock API**.

### How It Works

- When starting audio (Play button or enabling a formula) wake lock is requested — screen won't turn off
- When stopping audio (Stop button) wake lock is released
- If user switches to another tab or minimizes browser, browser automatically releases wake lock
- When returning to tab (if audio is still playing) wake lock is requested again

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | 84+ |
| Safari (iOS) | 16.4+ |
| Firefox | Not supported |

On unsupported browsers the feature simply doesn't activate (graceful degradation) — app continues working, but screen may turn off per device timeout.

---

## Dependencies

No external dependencies. Pure HTML + CSS + JavaScript.

- Web Audio API (AudioWorklet, BiquadFilter, Convolver, DynamicsCompressor)
- AudioWorklet for WAV recording (16-bit PCM)
- Web Share API for file sharing on mobile (optional)
- Screen Wake Lock API for preventing sleep mode (optional)
- Canvas 2D for oscilloscope

---

## Changelog

### 2025-12-24

- **Fixed:** Spectrogram no longer resets when scrolling the formula list — spectrogram data is now preserved when canvas dimensions are unchanged and copied when resizing
- **Added:** Copyright footer with link to source code on GitHub
