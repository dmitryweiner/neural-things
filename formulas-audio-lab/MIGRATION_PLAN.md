# Formula Audio Lab - TypeScript Migration Plan

## Overview

This document outlines the step-by-step plan to migrate the Formula Audio Lab from a single-file inline JavaScript application to a modular TypeScript project with proper build tooling.

---

## Phase 1: Project Setup

### Step 1.1: Initialize Node.js Project
```bash
npm init -y
```

### Step 1.2: Install Dependencies
```bash
# Build tooling
npm install -D typescript vite

# TypeScript types for Web APIs
npm install -D @types/dom-webcodecs
```

### Step 1.3: Create TypeScript Configuration

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.4: Create Vite Configuration

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### Step 1.5: Update package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Phase 2: Create Directory Structure

```
formulas-audio-lab/
├── src/
│   ├── index.ts                    # Entry point
│   ├── types/
│   │   ├── index.ts
│   │   ├── audio.ts
│   │   ├── formula.ts
│   │   ├── effects.ts
│   │   └── state.ts
│   ├── config/
│   │   ├── formulas.ts
│   │   ├── defaults.ts
│   │   └── presets.ts
│   ├── audio/
│   │   ├── index.ts
│   │   ├── AudioEngine.ts
│   │   ├── effects/
│   │   │   ├── index.ts
│   │   │   ├── EffectsChain.ts
│   │   │   ├── Filter.ts
│   │   │   ├── Chorus.ts
│   │   │   ├── Reverb.ts
│   │   │   ├── Limiter.ts
│   │   │   ├── Delay.ts
│   │   │   └── Phaser.ts
│   │   └── worklets/
│   │       ├── formula-generator.ts
│   │       └── recorder.ts
│   ├── state/
│   │   ├── index.ts
│   │   ├── StateManager.ts
│   │   ├── URLState.ts
│   │   └── LocalStorage.ts
│   ├── ui/
│   │   ├── index.ts
│   │   ├── UIManager.ts
│   │   ├── components/
│   │   │   ├── FormulaCard.ts
│   │   │   ├── EffectsPanel.ts
│   │   │   ├── TopBar.ts
│   │   │   ├── Oscilloscope.ts
│   │   │   ├── Spectrogram.ts
│   │   │   └── HelpModal.ts
│   │   └── dom.ts
│   ├── recording/
│   │   ├── index.ts
│   │   ├── Recorder.ts
│   │   └── WAVEncoder.ts
│   └── utils/
│       ├── index.ts
│       ├── base64url.ts
│       ├── wakeLock.ts
│       └── visibility.ts
├── public/
│   └── (static assets if any)
├── styles/
│   └── main.css
├── index.html
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

---

## Phase 3: Migration Steps (In Order)

### Step 3.1: Types First
Create all type definitions before any implementation.

**Files to create:**
1. `src/types/formula.ts` - SliderConfig, FormulaConfig interfaces
2. `src/types/effects.ts` - EffectsState, individual effect params
3. `src/types/state.ts` - AppState, FormulaState interfaces
4. `src/types/audio.ts` - AudioEngine related types
5. `src/types/index.ts` - Re-export all types

**Source mapping:**
- Lines 961-1069 in index.html → `src/types/formula.ts`
- Lines 1207-1235 in index.html → `src/types/state.ts`

---

### Step 3.2: Utility Functions
Pure functions with no dependencies.

**Files to create:**
1. `src/utils/base64url.ts` - b64urlEncode, b64urlDecode
2. `src/utils/wakeLock.ts` - requestWakeLock, releaseWakeLock
3. `src/utils/visibility.ts` - Page visibility handling
4. `src/ui/dom.ts` - $(), fmt() helpers

**Source mapping:**
- Lines 1084-1097 → `src/utils/base64url.ts`
- Lines 1427-1443 → `src/utils/wakeLock.ts`
- Lines 1446-1479 → `src/utils/visibility.ts`
- Lines 1072-1081 → `src/ui/dom.ts`

---

### Step 3.3: Configuration
Static data and schema definitions.

**Files to create:**
1. `src/config/formulas.ts` - FORMULAS array
2. `src/config/defaults.ts` - DEFAULT_FX, default slider values
3. `src/config/presets.ts` - Move from presets.js

**Source mapping:**
- Lines 961-1069 → `src/config/formulas.ts`
- Lines 1239-1246 → `src/config/defaults.ts`
- presets.js → `src/config/presets.ts`

---

### Step 3.4: AudioWorklet Processors
Must be separate files for Vite to handle correctly.

**Files to create:**
1. `src/audio/worklets/formula-generator.ts`
2. `src/audio/worklets/recorder.ts`

**Source mapping:**
- Lines 619-911 → `src/audio/worklets/formula-generator.ts`
- Lines 914-957 → `src/audio/worklets/recorder.ts`

**Note:** AudioWorklets need special handling in Vite. Use:
```typescript
// In AudioEngine.ts
const workletUrl = new URL('./worklets/formula-generator.ts', import.meta.url);
await ctx.audioWorklet.addModule(workletUrl);
```

---

### Step 3.5: Recording Module
Isolated recording functionality.

**Files to create:**
1. `src/recording/WAVEncoder.ts` - encodeWAV function
2. `src/recording/Recorder.ts` - Recorder class

**Source mapping:**
- Lines 1482-1527 → `src/recording/WAVEncoder.ts`
- Lines 2116-2199 → `src/recording/Recorder.ts`

---

### Step 3.6: Effects Modules
Each effect as a separate class.

**Files to create:**
1. `src/audio/effects/Filter.ts`
2. `src/audio/effects/Chorus.ts`
3. `src/audio/effects/Reverb.ts`
4. `src/audio/effects/Limiter.ts`
5. `src/audio/effects/Delay.ts`
6. `src/audio/effects/Phaser.ts`
7. `src/audio/effects/EffectsChain.ts`

**Source mapping:**
- Lines 1551-1668 (setFXEnabled) → `src/audio/effects/EffectsChain.ts`
- Lines 1691-1761 (updateFXParams) → Individual effect classes

**Example structure:**
```typescript
// src/audio/effects/Filter.ts
export class Filter {
  private node: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.node = ctx.createBiquadFilter();
  }

  get input(): AudioNode { return this.node; }
  get output(): AudioNode { return this.node; }

  setType(type: BiquadFilterType): void { }
  setFrequency(freq: number): void { }
  setQ(q: number): void { }
}
```

---

### Step 3.7: State Management
URL and localStorage state handling.

**Files to create:**
1. `src/state/URLState.ts` - loadStateFromURL, writeStateToURL
2. `src/state/LocalStorage.ts` - savePreset, loadPreset
3. `src/state/StateManager.ts` - Central state coordinator

**Source mapping:**
- Lines 1361-1376 → `src/state/URLState.ts`
- Lines 1199-1359 → `src/state/StateManager.ts`

---

### Step 3.8: AudioEngine
Main audio graph management.

**File to create:**
1. `src/audio/AudioEngine.ts`

**Source mapping:**
- Lines 1378-1928 → `src/audio/AudioEngine.ts`

**Class structure:**
```typescript
export class AudioEngine extends EventTarget {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mixBus: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private effectsChain: EffectsChain | null = null;
  private generators: Map<string, GeneratorNode> = new Map();
  private recorder: Recorder | null = null;

  get isRunning(): boolean { }
  get audioContext(): AudioContext | null { }
  get analyserNode(): AnalyserNode | null { }

  async start(): Promise<void> { }
  stop(): void { }

  setMasterGain(value: number): void { }
  enableFormula(id: string, enabled: boolean): void { }
  updateFormulaParam(id: string, param: string, value: number): void { }
  resetFormula(id: string): void { }

  // Recording
  startRecording(): void { }
  async stopRecording(): Promise<Blob> { }
}
```

---

### Step 3.9: UI Components
Modular UI building.

**Files to create:**
1. `src/ui/components/FormulaCard.ts`
2. `src/ui/components/EffectsPanel.ts`
3. `src/ui/components/TopBar.ts`
4. `src/ui/components/Oscilloscope.ts`
5. `src/ui/components/Spectrogram.ts`
6. `src/ui/components/HelpModal.ts`

**Source mapping:**
- Lines 1100-1143 (makeFormulaUI) → `src/ui/components/FormulaCard.ts`
- Lines 1931-2113 (scope drawing) → `src/ui/components/Oscilloscope.ts`, `Spectrogram.ts`

---

### Step 3.10: UIManager
Central UI controller.

**File to create:**
1. `src/ui/UIManager.ts`

**Source mapping:**
- Lines 2201-2537 (event wiring) → `src/ui/UIManager.ts`

---

### Step 3.11: Entry Point
Wire everything together.

**File to create:**
1. `src/index.ts`

```typescript
import { AudioEngine } from './audio';
import { UIManager } from './ui';
import { StateManager } from './state';
import { FORMULAS } from './config/formulas';

async function main() {
  const audio = new AudioEngine();
  const state = new StateManager();
  const ui = new UIManager(audio, state, FORMULAS);

  // Load state from URL if present
  const urlState = state.loadFromURL();
  if (urlState) {
    ui.applyState(urlState);
  }

  // Show help on first visit
  if (!state.hasSeenHelp()) {
    ui.showHelp();
  }
}

main().catch(console.error);
```

---

### Step 3.12: Extract CSS

**File to create:**
1. `styles/main.css` - All styles from lines 7-317

Update `index.html` to link external CSS:
```html
<link rel="stylesheet" href="/styles/main.css">
```

---

### Step 3.13: Simplify HTML

Reduce `index.html` to minimal shell:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Formula Audio Lab</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

---

## Phase 4: Testing & Validation

### Step 4.1: Manual Testing Checklist
- [ ] Audio starts/stops correctly
- [ ] All 18 formulas produce correct sound
- [ ] All effects work (Filter, Chorus, Reverb, Limiter, Delay, Phaser)
- [ ] Recording exports valid WAV files
- [ ] Oscilloscope/Spectrogram displays correctly
- [ ] Presets load/save/share work
- [ ] URL state persistence works
- [ ] Mobile: Wake lock prevents sleep
- [ ] Mobile: Background audio continues
- [ ] Help modal shows on first visit

### Step 4.2: Add Unit Tests (Optional)
```bash
npm install -D vitest @vitest/ui
```

Test candidates:
- `base64url.ts` - Encoding/decoding
- `WAVEncoder.ts` - WAV file structure
- `StateManager.ts` - State serialization
- Each effect class - Parameter setting

---

## Phase 5: Build & Deploy

### Step 5.1: Production Build
```bash
npm run build
```

### Step 5.2: Update GitHub Pages
Ensure `dist/` is deployed or configure GitHub Actions.

---

## Migration Order Summary

| Order | Module | Complexity | Dependencies |
|-------|--------|------------|--------------|
| 1 | Types | Low | None |
| 2 | Utils (base64, wakeLock) | Low | Types |
| 3 | Config (formulas, defaults) | Low | Types |
| 4 | DOM utilities | Low | None |
| 5 | AudioWorklets | Medium | Types |
| 6 | WAVEncoder | Low | None |
| 7 | Individual Effects | Medium | Types, Audio API |
| 8 | EffectsChain | Medium | Effects |
| 9 | Recorder | Medium | WAVEncoder, Worklet |
| 10 | StateManager | Medium | Types, Utils |
| 11 | AudioEngine | High | Effects, Worklets, Recorder |
| 12 | UI Components | Medium | DOM utils |
| 13 | UIManager | High | All UI components, Audio, State |
| 14 | Entry point | Low | All modules |
| 15 | CSS extraction | Low | None |
| 16 | HTML simplification | Low | None |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AudioWorklet module loading issues | Use Vite's worker plugin or inline as data URL fallback |
| Safari AudioContext suspension | Keep existing resume() logic in AudioEngine |
| Type errors in complex audio graph | Start with `any` types, gradually tighten |
| Breaking changes during migration | Keep original index.html until migration complete |
| Performance regression | Profile before/after, ensure no unnecessary re-renders |

---

## Files to Keep During Migration

Keep these files until migration is complete and tested:
- `index.html` (original)
- `presets.js` (original)

After successful migration, these become:
- `index.html` (simplified shell)
- `src/config/presets.ts` (TypeScript version)

---

## Estimated Effort

| Phase | Time Estimate |
|-------|---------------|
| Phase 1: Setup | 30 min |
| Phase 2: Directory structure | 15 min |
| Phase 3: Migration (Steps 3.1-3.13) | 4-6 hours |
| Phase 4: Testing | 1-2 hours |
| Phase 5: Deploy | 30 min |
| **Total** | **6-9 hours** |

---

## Next Steps

1. Run `npm init -y` to create package.json
2. Install dependencies
3. Create tsconfig.json and vite.config.ts
4. Create directory structure
5. Begin migration with Types (Phase 3.1)
