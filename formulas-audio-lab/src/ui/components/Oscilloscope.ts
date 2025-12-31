import type { AudioEngine } from '../../audio';

export type ScopeMode = 'wave' | 'spectrum';

/**
 * Oscilloscope/Spectrogram visualization component
 */
export class Oscilloscope {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scopeMode: ScopeMode = 'spectrum';
  private scopeAutoGain = 1.0;

  // Spectrogram state
  private spectroCanvas: HTMLCanvasElement | null = null;
  private spectroCtx: CanvasRenderingContext2D | null = null;
  private lastCanvasWidth = 0;
  private lastCanvasHeight = 0;
  private lastSpectroTime = 0;
  private readonly SPECTRO_INTERVAL = 33; // ~30 fps

  // Buffers
  private timeBuf: Uint8Array<ArrayBuffer> | null = null;
  private freqBuf: Uint8Array<ArrayBuffer> | null = null;

  // Animation
  private rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private audio: AudioEngine
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Handle resize
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get mode(): ScopeMode {
    return this.scopeMode;
  }

  setMode(mode: ScopeMode): void {
    this.scopeMode = mode;
  }

  toggleMode(): ScopeMode {
    this.scopeMode = this.scopeMode === 'wave' ? 'spectrum' : 'wave';
    return this.scopeMode;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    // Reinit spectrogram on resize
    if (this.audio.analyserNode) {
      this.initSpectro(
        this.canvas.width,
        this.canvas.height,
        this.audio.analyserNode.frequencyBinCount
      );
    }
  }

  start(): void {
    if (this.rafId !== null) return;

    const analyser = this.audio.analyserNode;
    if (!analyser) return;

    this.timeBuf = new Uint8Array(analyser.fftSize);
    this.freqBuf = new Uint8Array(analyser.frequencyBinCount);
    this.initSpectro(
      this.canvas.width,
      this.canvas.height,
      analyser.frequencyBinCount
    );

    this.draw();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private initSpectro(w: number, h: number, _fftBins: number): void {
    if (
      this.spectroCanvas &&
      this.lastCanvasWidth === w &&
      this.lastCanvasHeight === h
    ) {
      return;
    }

    const newCanvas = document.createElement('canvas');
    newCanvas.width = w;
    newCanvas.height = h;
    const newCtx = newCanvas.getContext('2d')!;

    // Fill background
    newCtx.fillStyle = '#060a0f';
    newCtx.fillRect(0, 0, w, h);

    // Copy old content if exists
    if (this.spectroCanvas && this.spectroCtx) {
      newCtx.drawImage(this.spectroCanvas, 0, 0, w, h);
    }

    this.spectroCanvas = newCanvas;
    this.spectroCtx = newCtx;
    this.lastCanvasWidth = w;
    this.lastCanvasHeight = h;
  }

  private getSpectroColor(value: number): string {
    const v = Math.min(255, Math.max(0, value));
    const hue = 240 - (v / 255) * 240;
    const lightness = 20 + (v / 255) * 40;
    return `hsl(${hue}, 100%, ${lightness}%)`;
  }

  private draw = (): void => {
    this.rafId = requestAnimationFrame(this.draw);

    if (!this.audio.analyserNode || !this.timeBuf || !this.freqBuf) return;

    // Skip if page hidden
    if (!this.audio.isPageVisible()) return;

    // Get data
    this.audio.getTimeDomainData(this.timeBuf);
    this.audio.getFrequencyData(this.freqBuf);

    // Calculate peak for auto-gain
    let peak = 1e-4;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const v = (this.timeBuf[i] - 128) / 128;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }

    let target = 0.85 / peak;
    target = Math.max(0.25, Math.min(12.0, target));
    this.scopeAutoGain += (target - this.scopeAutoGain) * 0.08;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Reinit if size changed
    if (w !== this.lastCanvasWidth || h !== this.lastCanvasHeight) {
      this.initSpectro(w, h, this.freqBuf.length);
    }

    if (this.scopeMode === 'spectrum') {
      this.drawSpectrum(w, h);
    } else {
      this.drawWave(w, h);
    }
  };

  private drawSpectrum(w: number, h: number): void {
    const now = performance.now();

    if (now - this.lastSpectroTime >= this.SPECTRO_INTERVAL) {
      this.lastSpectroTime = now;

      if (this.spectroCtx && this.freqBuf) {
        const shiftAmount = 2;
        this.spectroCtx.drawImage(this.spectroCanvas!, -shiftAmount, 0);

        const bins = this.freqBuf.length;
        const minFreq = 20;
        const maxFreq = 10000;
        const nyquist = this.audio.sampleRate / 2;

        for (let i = 0; i < h; i++) {
          const normalizedY = i / h;
          const freq = maxFreq * Math.pow(minFreq / maxFreq, normalizedY);
          const binIndex = Math.floor((freq / nyquist) * bins);
          const value = this.freqBuf[Math.min(binIndex, bins - 1)];
          this.spectroCtx.fillStyle = this.getSpectroColor(value);
          this.spectroCtx.fillRect(w - shiftAmount, i, shiftAmount, 1);
        }
      }
    }

    if (this.spectroCtx) {
      this.ctx.drawImage(this.spectroCanvas!, 0, 0);
    } else {
      this.ctx.fillStyle = '#060a0f';
      this.ctx.fillRect(0, 0, w, h);
    }
  }

  private drawWave(w: number, h: number): void {
    // Dark background
    this.ctx.fillStyle = '#060a0f';
    this.ctx.fillRect(0, 0, w, h);

    // Grid
    this.ctx.strokeStyle = 'rgba(18, 32, 51, 0.7)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const x = (w * i) / 10;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }
    for (let i = 1; i < 5; i++) {
      const y = (h * i) / 5;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }
    this.ctx.stroke();

    // Waveform
    if (!this.timeBuf) return;

    const mid = h / 2;
    this.ctx.strokeStyle = '#8ab4ff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const gain = this.scopeAutoGain;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const v = (this.timeBuf[i] - 128) / 128;
      const y = mid - v * (mid * 0.9) * gain;
      const x = (w * i) / (this.timeBuf.length - 1);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }
}
