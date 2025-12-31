import { EffectsChain } from './effects';
import { FORMULAS } from '../config/formulas';
import { requestWakeLock, releaseWakeLock } from '../utils/wakeLock';
import { isPageVisible, onVisibilityChange } from '../utils/visibility';
import { encodeWAV, generateWAVFilename } from '../recording/WAVEncoder';
import type {
  AppState,
  EffectsState,
  GeneratorNode,
  WorkletMessage,
  RecorderDataMessage,
} from '../types';

export type AudioEngineEvent = 'start' | 'stop' | 'recording-start' | 'recording-stop';

/**
 * Main audio engine
 * Manages the audio graph, generators, effects, and recording
 */
export class AudioEngine extends EventTarget {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mixBus: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private effectsChain: EffectsChain | null = null;
  private generators: Map<string, GeneratorNode> = new Map();
  private recorderNode: AudioWorkletNode | null = null;
  private _isRecording = false;
  private visibilityUnsubscribe: (() => void) | null = null;

  /**
   * Check if audio is running
   */
  get isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /**
   * Check if recording is active
   */
  get isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * Get the audio context (for external use)
   */
  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Get the analyser node (for visualization)
   */
  get analyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Get sample rate
   */
  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100;
  }

  /**
   * Start the audio engine
   */
  async start(initialState?: AppState): Promise<void> {
    if (this.ctx) return;

    // Create audio context
    this.ctx = new AudioContext({ latencyHint: 'interactive' });

    // iOS Safari: AudioContext may start suspended
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Load worklets
    const generatorUrl = new URL(
      './worklets/formula-generator.worklet.ts',
      import.meta.url
    );
    const recorderUrl = new URL(
      './worklets/recorder.worklet.ts',
      import.meta.url
    );

    await Promise.all([
      this.ctx.audioWorklet.addModule(generatorUrl),
      this.ctx.audioWorklet.addModule(recorderUrl),
    ]);

    // Create nodes
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.mixBus = this.ctx.createGain();
    this.mixBus.gain.value = 1;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = initialState?.masterGain ?? 0.25;

    // Create effects chain
    this.effectsChain = new EffectsChain(this.ctx);

    // Connect: mixBus -> effects -> masterGain -> analyser -> destination
    this.mixBus.connect(this.effectsChain.input);
    this.effectsChain.output.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Create recorder node
    this.recorderNode = new AudioWorkletNode(this.ctx, 'recorder-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    // Connect recorder (with silent output to keep it active)
    this.masterGain.connect(this.recorderNode);
    const silentGain = this.ctx.createGain();
    silentGain.gain.value = 0;
    this.recorderNode.connect(silentGain);
    silentGain.connect(this.ctx.destination);

    // Create generators
    for (const f of FORMULAS) {
      const initParams: Record<string, number> = {};
      for (const s of f.sliders) {
        const stateParams = initialState?.formulas?.[f.id]?.params;
        initParams[s.k] = stateParams?.[s.k] ?? s.value;
      }

      const worklet = new AudioWorkletNode(this.ctx, 'formula-generator', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { formula: f.id, params: initParams },
      });

      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      worklet.connect(gain);
      gain.connect(this.mixBus);

      this.generators.set(f.id, { worklet, gain, params: initParams });
    }

    // Apply initial effects state
    if (initialState?.fx) {
      this.updateEffects(initialState.fx);
    }

    // Enable generators based on initial state
    if (initialState?.formulas) {
      for (const [id, state] of Object.entries(initialState.formulas)) {
        if (state.enabled) {
          this.enableFormula(id, true);
        }
      }
    }

    // Request wake lock
    await requestWakeLock();

    // Handle visibility changes
    this.visibilityUnsubscribe = onVisibilityChange(async (visible) => {
      if (visible && this.ctx) {
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
        await requestWakeLock();
      }
    });

    this.dispatchEvent(new Event('start'));
  }

  /**
   * Stop the audio engine
   */
  async stop(): Promise<void> {
    if (!this.ctx) return;

    // Stop recording if active
    if (this._isRecording) {
      await this.stopRecording();
    }

    // Release wake lock
    await releaseWakeLock();

    // Unsubscribe from visibility changes
    if (this.visibilityUnsubscribe) {
      this.visibilityUnsubscribe();
      this.visibilityUnsubscribe = null;
    }

    // Fade out master
    const now = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(0, now, 0.01);

    // Cleanup after fade
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Destroy effects
    this.effectsChain?.destroy();

    // Close context
    await this.ctx.close();

    // Clear references
    this.ctx = null;
    this.analyser = null;
    this.mixBus = null;
    this.masterGain = null;
    this.effectsChain = null;
    this.recorderNode = null;
    this.generators.clear();

    this.dispatchEvent(new Event('stop'));
  }

  /**
   * Set master gain
   */
  setMasterGain(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  /**
   * Enable or disable a formula generator
   */
  enableFormula(id: string, enabled: boolean): void {
    const gen = this.generators.get(id);
    if (!gen || !this.ctx) return;

    const now = this.ctx.currentTime;
    const targetGain = enabled ? (gen.params.gain ?? 0.2) : 0;
    gen.gain.gain.setTargetAtTime(targetGain, now, 0.02);
  }

  /**
   * Update a formula parameter
   */
  updateFormulaParam(id: string, param: string, value: number): void {
    const gen = this.generators.get(id);
    if (!gen) return;

    gen.params[param] = value;
    const msg: WorkletMessage = { type: 'set', params: { [param]: value } };
    gen.worklet.port.postMessage(msg);

    // If gain changed and formula is enabled, update gain node
    if (param === 'gain' && gen.gain.gain.value > 0 && this.ctx) {
      gen.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Reset formula state
   */
  resetFormula(id: string): void {
    const gen = this.generators.get(id);
    if (!gen) return;

    const msg: WorkletMessage = { type: 'reset' };
    gen.worklet.port.postMessage(msg);
  }

  /**
   * Update effects chain
   */
  updateEffects(state: EffectsState): void {
    if (!this.effectsChain || !this.mixBus || !this.masterGain) return;

    // Rebuild routing
    this.mixBus.disconnect();
    this.effectsChain.output.disconnect();

    this.effectsChain.rebuild(state);
    this.effectsChain.updateParams(state);

    // Reconnect
    this.mixBus.connect(this.effectsChain.input);
    this.effectsChain.output.connect(this.masterGain);
  }

  /**
   * Update only effect parameters (no routing change)
   */
  updateEffectParams(state: EffectsState): void {
    this.effectsChain?.updateParams(state);
  }

  /**
   * Start recording
   */
  startRecording(): void {
    if (!this.recorderNode || this._isRecording) return;

    this._isRecording = true;
    this.recorderNode.port.postMessage({ type: 'start' });
    this.dispatchEvent(new Event('recording-start'));
  }

  /**
   * Stop recording and return WAV blob
   */
  async stopRecording(): Promise<{ blob: Blob; filename: string } | null> {
    if (!this.recorderNode || !this._isRecording || !this.ctx) return null;

    return new Promise((resolve) => {
      this.recorderNode!.port.onmessage = (
        e: MessageEvent<RecorderDataMessage>
      ) => {
        if (e.data.type === 'data') {
          this._isRecording = false;
          const blob = encodeWAV(e.data.samples, this.ctx!.sampleRate);
          const filename = generateWAVFilename();

          this.dispatchEvent(
            new CustomEvent('recording-stop', { detail: { blob, filename } })
          );
          resolve({ blob, filename });
        }
      };

      this.recorderNode!.port.postMessage({ type: 'stop' });
    });
  }

  /**
   * Get time domain data for oscilloscope
   */
  getTimeDomainData(buffer: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteTimeDomainData(buffer);
  }

  /**
   * Get frequency data for spectrum
   */
  getFrequencyData(buffer: Uint8Array<ArrayBuffer>): void {
    this.analyser?.getByteFrequencyData(buffer);
  }

  /**
   * Check if page is visible
   */
  isPageVisible(): boolean {
    return isPageVisible();
  }
}
