import { AudioEngine } from './audio';
import { StateManager } from './state';
import { FORMULAS, PRESETS, DEFAULT_FX } from './config';
import { Oscilloscope, createFormulaCard, updateFormulaCard, createKnob, updateKnob, getKnobValue } from './ui';
import { $, $require } from './ui/dom';
import type { AppState, EffectsState } from './types';

import './styles/main.css';

// FX knob configurations
interface FxKnobConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  stateKey: keyof EffectsState;
}

const FX_KNOBS: Record<string, FxKnobConfig[]> = {
  filter: [
    { id: 'fxFilterFreq', label: 'Cutoff', min: 20, max: 2000, step: 1, value: 1000, stateKey: 'filterFreq' },
    { id: 'fxFilterQ', label: 'Q', min: 0.1, max: 30, step: 0.1, value: 0.7, stateKey: 'filterQ' },
  ],
  chorus: [
    { id: 'fxChorusRate', label: 'Rate', min: 0.01, max: 8, step: 0.01, value: 0.35, stateKey: 'chorusRate' },
    { id: 'fxChorusDepth', label: 'Depth', min: 0, max: 20, step: 0.1, value: 6, stateKey: 'chorusDepth' },
    { id: 'fxChorusMix', label: 'Mix', min: 0, max: 1, step: 0.01, value: 0.35, stateKey: 'chorusMix' },
    { id: 'fxChorusFb', label: 'Feedback', min: 0, max: 0.95, step: 0.01, value: 0.15, stateKey: 'chorusFb' },
  ],
  reverb: [
    { id: 'fxReverbDecay', label: 'Decay', min: 0.1, max: 8, step: 0.1, value: 2.8, stateKey: 'reverbDecay' },
    { id: 'fxReverbMix', label: 'Mix', min: 0, max: 1, step: 0.01, value: 0.25, stateKey: 'reverbMix' },
  ],
  limiter: [
    { id: 'fxLimiterThr', label: 'Threshold', min: -40, max: 0, step: 0.5, value: -12, stateKey: 'limiterThr' },
    { id: 'fxLimiterRel', label: 'Release', min: 0.02, max: 1, step: 0.01, value: 0.15, stateKey: 'limiterRel' },
  ],
  delay: [
    { id: 'fxDelayTime', label: 'Time', min: 0.05, max: 2.0, step: 0.01, value: 0.35, stateKey: 'delayTime' },
    { id: 'fxDelayFb', label: 'Feedback', min: 0, max: 0.9, step: 0.01, value: 0.4, stateKey: 'delayFb' },
    { id: 'fxDelayMix', label: 'Mix', min: 0, max: 1, step: 0.01, value: 0.3, stateKey: 'delayMix' },
  ],
  phaser: [
    { id: 'fxPhaserRate', label: 'Rate', min: 0.1, max: 10, step: 0.01, value: 0.5, stateKey: 'phaserRate' },
    { id: 'fxPhaserDepth', label: 'Depth', min: 0, max: 1, step: 0.01, value: 0.7, stateKey: 'phaserDepth' },
    { id: 'fxPhaserFb', label: 'Feedback', min: 0, max: 0.9, step: 0.01, value: 0.3, stateKey: 'phaserFb' },
    { id: 'fxPhaserMix', label: 'Mix', min: 0, max: 1, step: 0.01, value: 0.5, stateKey: 'phaserMix' },
  ],
};

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  // Initialize managers
  const audio = new AudioEngine();
  const state = new StateManager();

  // Store references to created knobs
  const fxKnobs: Map<string, HTMLElement> = new Map();
  let masterGainKnob: HTMLElement | null = null;

  // DOM elements
  const statusEl = $require('#status');
  const playStopBtn = $require<HTMLButtonElement>('#playStopBtn');
  const recBtn = $require<HTMLButtonElement>('#recBtn');
  const savePresetBtn = $require<HTMLButtonElement>('#savePresetBtn');
  const loadPresetBtn = $require<HTMLButtonElement>('#loadPresetBtn');
  const shareBtn = $require<HTMLButtonElement>('#shareBtn');
  const presetSelect = $require<HTMLSelectElement>('#presetSelect');
  const scopeToggleBtn = $require<HTMLButtonElement>('#scopeToggleBtn');
  const scopeModeBtn = $require<HTMLButtonElement>('#scopeModeBtn');
  const effectsBtn = $require<HTMLButtonElement>('#effectsBtn');
  const scopeWrap = $require('#scopeWrap');
  const effectsPanel = $require('#effectsPanel');
  const masterGainWrap = $require('#masterGainWrap');
  const formulasRoot = $require('#formulas');
  const disableAllBtn = $require<HTMLButtonElement>('#disableAllBtn');
  const collapseAllBtn = $require<HTMLButtonElement>('#collapseAllBtn');
  const helpOverlay = $require('#helpOverlay');
  const helpBtn = $require<HTMLButtonElement>('#helpBtn');
  const helpCloseBtn = $require<HTMLButtonElement>('#helpCloseBtn');
  const canvas = $require<HTMLCanvasElement>('#scope');

  // Oscilloscope
  let oscilloscope: Oscilloscope | null = null;

  // Track collapse state
  let allCollapsed = false;

  // =========== Create Master Gain Knob ===========

  masterGainKnob = createKnob({
    id: 'masterGain',
    min: 0,
    max: 1,
    step: 0.001,
    value: 0.25,
    size: 'lg',
    label: 'Master Volume',
    showTicks: true,
    onChange: (v) => {
      audio.setMasterGain(v);
    },
  });
  masterGainWrap.appendChild(masterGainKnob);

  // =========== Create FX Knobs ===========

  function createFxKnobs(): void {
    for (const [section, knobs] of Object.entries(FX_KNOBS)) {
      const container = $(`#${section}Knobs`);
      if (!container) continue;

      for (const cfg of knobs) {
        const knob = createKnob({
          id: cfg.id,
          min: cfg.min,
          max: cfg.max,
          step: cfg.step,
          value: cfg.value,
          size: 'sm',
          label: cfg.label,
          showTicks: false,
          onChange: () => {
            if (audio.isRunning) {
              audio.updateEffectParams(readFXFromUI());
            }
          },
        });
        container.appendChild(knob);
        fxKnobs.set(cfg.id, knob);
      }
    }
  }

  createFxKnobs();

  // =========== UI State Reading ===========

  function readStateFromUI(): AppState {
    const formulas: Record<string, { enabled: boolean; params: Record<string, number> }> = {};

    for (const f of FORMULAS) {
      const enableEl = $<HTMLInputElement>(`#en_${f.id}`);
      const enabled = enableEl?.checked ?? false;
      const params: Record<string, number> = {};

      for (const s of f.sliders) {
        const knob = document.querySelector(`[data-knob-id="${f.id}_${s.k}"]`) as HTMLElement;
        params[s.k] = knob ? getKnobValue(knob) : s.value;
      }

      formulas[f.id] = { enabled, params };
    }

    const masterGainValue = masterGainKnob ? getKnobValue(masterGainKnob) : 0.25;

    return {
      v: 2,
      masterGain: masterGainValue,
      fx: readFXFromUI(),
      formulas,
    };
  }

  function readFXFromUI(): EffectsState {
    const getKnobVal = (id: string, defaultVal: number): number => {
      const knob = fxKnobs.get(id);
      return knob ? getKnobValue(knob) : defaultVal;
    };

    return {
      filterOn: ($<HTMLInputElement>('#fxFilterOn')?.checked) ?? false,
      filterType: ($<HTMLSelectElement>('#fxFilterType')?.value as BiquadFilterType) ?? 'lowpass',
      filterFreq: getKnobVal('fxFilterFreq', 1000),
      filterQ: getKnobVal('fxFilterQ', 0.7),
      chorusOn: ($<HTMLInputElement>('#fxChorusOn')?.checked) ?? false,
      chorusMode: ($<HTMLSelectElement>('#fxChorusMode')?.value as 'chorus' | 'flanger') ?? 'chorus',
      chorusRate: getKnobVal('fxChorusRate', 0.35),
      chorusDepth: getKnobVal('fxChorusDepth', 6),
      chorusMix: getKnobVal('fxChorusMix', 0.35),
      chorusFb: getKnobVal('fxChorusFb', 0.15),
      reverbOn: ($<HTMLInputElement>('#fxReverbOn')?.checked) ?? false,
      reverbDecay: getKnobVal('fxReverbDecay', 2.8),
      reverbMix: getKnobVal('fxReverbMix', 0.25),
      limiterOn: ($<HTMLInputElement>('#fxLimiterOn')?.checked) ?? false,
      limiterThr: getKnobVal('fxLimiterThr', -12),
      limiterRel: getKnobVal('fxLimiterRel', 0.15),
      delayOn: ($<HTMLInputElement>('#fxDelayOn')?.checked) ?? false,
      delayTime: getKnobVal('fxDelayTime', 0.35),
      delayFb: getKnobVal('fxDelayFb', 0.4),
      delayMix: getKnobVal('fxDelayMix', 0.3),
      phaserOn: ($<HTMLInputElement>('#fxPhaserOn')?.checked) ?? false,
      phaserRate: getKnobVal('fxPhaserRate', 0.5),
      phaserDepth: getKnobVal('fxPhaserDepth', 0.7),
      phaserStages: Number($<HTMLSelectElement>('#fxPhaserStages')?.value ?? 4),
      phaserFb: getKnobVal('fxPhaserFb', 0.3),
      phaserMix: getKnobVal('fxPhaserMix', 0.5),
    };
  }

  // =========== UI State Application ===========

  function applyStateToUI(appState: AppState, resetFirst = false): void {
    if (resetFirst) {
      resetToDefaults();
    }

    // Master gain
    if (masterGainKnob) {
      updateKnob(masterGainKnob, appState.masterGain);
    }

    // Effects
    applyFXToUI(appState.fx);

    // Formulas
    for (const f of FORMULAS) {
      const formulaState = appState.formulas?.[f.id];
      if (!formulaState) continue;

      updateFormulaCard(
        formulasRoot,
        f.id,
        formulaState.enabled,
        formulaState.params
      );
    }
  }

  function applyFXToUI(fx: Partial<EffectsState>): void {
    const setVal = (id: string, val: unknown) => {
      const el = $<HTMLSelectElement>(id);
      if (el && val !== undefined) el.value = String(val);
    };
    const setChk = (id: string, val: unknown) => {
      const el = $<HTMLInputElement>(id);
      if (el && val !== undefined) el.checked = Boolean(val);
    };
    const setKnob = (id: string, val: unknown) => {
      const knob = fxKnobs.get(id);
      if (knob && val !== undefined) updateKnob(knob, Number(val));
    };

    // Checkboxes
    setChk('#fxFilterOn', fx.filterOn);
    setChk('#fxChorusOn', fx.chorusOn);
    setChk('#fxReverbOn', fx.reverbOn);
    setChk('#fxLimiterOn', fx.limiterOn);
    setChk('#fxDelayOn', fx.delayOn);
    setChk('#fxPhaserOn', fx.phaserOn);

    // Selects
    setVal('#fxFilterType', fx.filterType);
    setVal('#fxChorusMode', fx.chorusMode);
    setVal('#fxPhaserStages', fx.phaserStages);

    // Knobs
    setKnob('fxFilterFreq', fx.filterFreq);
    setKnob('fxFilterQ', fx.filterQ);
    setKnob('fxChorusRate', fx.chorusRate);
    setKnob('fxChorusDepth', fx.chorusDepth);
    setKnob('fxChorusMix', fx.chorusMix);
    setKnob('fxChorusFb', fx.chorusFb);
    setKnob('fxReverbDecay', fx.reverbDecay);
    setKnob('fxReverbMix', fx.reverbMix);
    setKnob('fxLimiterThr', fx.limiterThr);
    setKnob('fxLimiterRel', fx.limiterRel);
    setKnob('fxDelayTime', fx.delayTime);
    setKnob('fxDelayFb', fx.delayFb);
    setKnob('fxDelayMix', fx.delayMix);
    setKnob('fxPhaserRate', fx.phaserRate);
    setKnob('fxPhaserDepth', fx.phaserDepth);
    setKnob('fxPhaserFb', fx.phaserFb);
    setKnob('fxPhaserMix', fx.phaserMix);
  }

  function resetToDefaults(): void {
    if (masterGainKnob) {
      updateKnob(masterGainKnob, 0.25);
    }
    applyFXToUI(DEFAULT_FX);

    for (const f of FORMULAS) {
      const params: Record<string, number> = {};
      for (const s of f.sliders) {
        params[s.k] = s.value;
      }
      updateFormulaCard(formulasRoot, f.id, false, params);
    }
  }

  // =========== Audio Control ===========

  async function startAudio(): Promise<void> {
    const currentState = readStateFromUI();
    await audio.start(currentState);

    statusEl.textContent = 'running';
    playStopBtn.textContent = '⏹ Stop';
    playStopBtn.classList.add('playing');
    recBtn.disabled = false;

    // Start oscilloscope
    oscilloscope = new Oscilloscope(canvas, audio);
    oscilloscope.start();
  }

  async function stopAudio(): Promise<void> {
    oscilloscope?.stop();
    oscilloscope = null;

    await audio.stop();

    statusEl.textContent = 'stopped';
    playStopBtn.textContent = '▶ Play';
    playStopBtn.classList.remove('playing');
    recBtn.disabled = true;
    recBtn.textContent = 'Record';
    recBtn.classList.remove('recording');
  }

  async function toggleAudio(): Promise<void> {
    if (audio.isRunning) {
      await stopAudio();
    } else {
      await startAudio();
    }
  }

  // =========== Recording ===========

  async function toggleRecording(): Promise<void> {
    if (!audio.isRunning) {
      statusEl.textContent = 'start audio first';
      return;
    }

    if (!audio.isRecording) {
      audio.startRecording();
      recBtn.textContent = '● REC';
      recBtn.classList.add('recording');
      statusEl.textContent = 'recording…';
    } else {
      recBtn.disabled = true;
      recBtn.classList.remove('recording');
      statusEl.textContent = 'finalizing…';

      const result = await audio.stopRecording();
      if (result) {
        const { blob, filename } = result;

        // Try sharing on mobile
        const file = new File([blob], filename, { type: 'audio/wav' });
        const canShare =
          'share' in navigator &&
          navigator.canShare?.({ files: [file] });

        if (canShare) {
          try {
            await navigator.share({ files: [file], title: 'Formula Audio Recording' });
            statusEl.textContent = 'shared';
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              downloadBlob(blob, filename);
            }
          }
        } else {
          downloadBlob(blob, filename);
        }
      }

      recBtn.disabled = false;
      recBtn.textContent = 'Record';
    }
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    statusEl.innerHTML = `ready — <a href="${url}" download="${filename}" style="color:#8ab4ff;">download</a>`;
  }

  // =========== Scope ===========

  function setScopeCollapsed(collapsed: boolean): void {
    scopeWrap.classList.toggle('scopeCollapsed', collapsed);
    scopeToggleBtn.classList.toggle('active', !collapsed);
    if (!collapsed) {
      setTimeout(() => oscilloscope?.resize(), 0);
    }
  }

  // =========== Help ===========

  function openHelp(): void {
    helpOverlay.classList.add('open');
  }

  function closeHelp(): void {
    helpOverlay.classList.remove('open');
    state.markHelpShown();
  }

  // =========== Build UI ===========

  // Build formula cards
  for (const f of FORMULAS) {
    const card = createFormulaCard(f, {
      onEnable: async (id, enabled) => {
        // Auto-start audio if enabling
        if (enabled && !audio.isRunning) {
          await startAudio();
        }

        if (audio.isRunning) {
          audio.enableFormula(id, enabled);
          updateFormulaCard(
            formulasRoot,
            id,
            enabled,
            readStateFromUI().formulas[id].params
          );
        }
      },
      onParamChange: (id, param, value) => {
        if (audio.isRunning) {
          audio.updateFormulaParam(id, param, value);

          // Update gain node if gain changed
          if (param === 'gain') {
            const enableEl = $<HTMLInputElement>(`#en_${id}`);
            if (enableEl?.checked) {
              audio.enableFormula(id, true);
            }
          }
        }
      },
      onReset: (id) => {
        if (audio.isRunning) {
          audio.resetFormula(id);
        }
      },
    });
    formulasRoot.appendChild(card);
  }

  // Populate presets dropdown
  for (let i = 0; i < PRESETS.length; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = PRESETS[i].name;
    presetSelect.appendChild(opt);
  }

  // =========== Event Wiring ===========

  // Play/Stop
  playStopBtn.addEventListener('click', toggleAudio);

  // Recording
  recBtn.addEventListener('click', toggleRecording);

  // Disable all
  disableAllBtn.addEventListener('click', () => {
    for (const f of FORMULAS) {
      audio.enableFormula(f.id, false);
      updateFormulaCard(formulasRoot, f.id, false, readStateFromUI().formulas[f.id].params);
    }
  });

  // Collapse all
  collapseAllBtn.addEventListener('click', () => {
    allCollapsed = !allCollapsed;
    for (const f of FORMULAS) {
      const body = $(`#body_${f.id}`);
      const colBtn = $(`#col_${f.id}`);
      body?.classList.toggle('collapsed', allCollapsed);
      if (colBtn) colBtn.textContent = allCollapsed ? '▶' : '▼';
    }
    collapseAllBtn.textContent = allCollapsed ? '▶ Expand all' : '▼ Collapse all';
  });

  // Scope toggle
  scopeToggleBtn.addEventListener('click', () => {
    setScopeCollapsed(!scopeWrap.classList.contains('scopeCollapsed'));
  });

  // Scope mode toggle
  scopeModeBtn.addEventListener('click', () => {
    if (oscilloscope) {
      const mode = oscilloscope.toggleMode();
      scopeModeBtn.textContent = mode === 'wave' ? 'Wave' : 'Spectrum';
    }
  });

  // Effects panel
  effectsBtn.addEventListener('click', () => {
    const open = !effectsPanel.classList.contains('open');
    effectsPanel.classList.toggle('open', open);
    effectsBtn.classList.toggle('active', open);
    setScopeCollapsed(open);
  });

  // FX routing changes (checkboxes)
  const fxRoutingInputs = [
    'fxFilterOn', 'fxChorusOn', 'fxReverbOn',
    'fxLimiterOn', 'fxDelayOn', 'fxPhaserOn',
  ];

  for (const id of fxRoutingInputs) {
    $(`#${id}`)?.addEventListener('change', () => {
      if (audio.isRunning) {
        audio.updateEffects(readFXFromUI());
      }
    });
  }

  // FX select changes
  const fxSelectInputs = ['fxFilterType', 'fxChorusMode', 'fxPhaserStages'];
  for (const id of fxSelectInputs) {
    $(`#${id}`)?.addEventListener('change', () => {
      if (audio.isRunning) {
        audio.updateEffectParams(readFXFromUI());
      }
    });
  }

  // Presets
  savePresetBtn.addEventListener('click', () => {
    state.saveToStorage(readStateFromUI());
    statusEl.textContent = 'preset saved';
  });

  loadPresetBtn.addEventListener('click', () => {
    const preset = state.loadFromStorage();
    if (!preset) {
      statusEl.textContent = 'no preset';
      return;
    }
    applyStateToUI(preset);
    if (audio.isRunning) {
      audio.updateEffects(readFXFromUI());
    }
    statusEl.textContent = 'preset loaded';
  });

  shareBtn.addEventListener('click', async () => {
    const url = state.saveToURL(readStateFromUI());
    try {
      await navigator.clipboard.writeText(url);
      statusEl.textContent = 'link copied';
    } catch {
      statusEl.textContent = 'link in URL';
    }
  });

  presetSelect.addEventListener('change', () => {
    const idx = presetSelect.value;
    if (idx === '') return;

    const preset = PRESETS[Number(idx)];
    if (!preset?.state) return;

    applyStateToUI(preset.state, true);
    if (audio.isRunning) {
      audio.updateEffects(readFXFromUI());
    }
    statusEl.textContent = `loaded: ${preset.name}`;
  });

  // Help
  helpBtn.addEventListener('click', openHelp);
  helpCloseBtn.addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) closeHelp();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpOverlay.classList.contains('open')) {
      closeHelp();
    }
  });

  // =========== Initialization ===========

  // Default scope state on mobile
  const defaultCollapse =
    window.matchMedia?.('(max-width: 600px)').matches ?? false;
  setScopeCollapsed(defaultCollapse);

  // Load state from URL if present
  const urlState = state.loadFromURL();
  if (urlState) {
    applyStateToUI(urlState);
  }

  // Show help on first visit
  if (!state.hasSeenHelp()) {
    openHelp();
  }
}

// Start app
main().catch(console.error);
