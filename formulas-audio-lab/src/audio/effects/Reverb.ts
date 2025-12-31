/**
 * Convolution Reverb effect
 * Uses procedurally generated impulse response
 */
export class Reverb {
  private convolver: ConvolverNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  constructor(private ctx: AudioContext) {
    this.convolver = ctx.createConvolver();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
  }

  get convolverNode(): ConvolverNode {
    return this.convolver;
  }

  get dry(): GainNode {
    return this.dryGain;
  }

  get wet(): GainNode {
    return this.wetGain;
  }

  /**
   * Generate a procedural impulse response
   */
  private makeImpulseResponse(seconds: number, decay: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = this.ctx.createBuffer(2, len, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-t / Math.max(1e-3, decay));
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }

    return buf;
  }

  setDecay(decay: number): void {
    const seconds = Math.min(6.0, Math.max(0.3, decay * 1.4));
    this.convolver.buffer = this.makeImpulseResponse(seconds, decay);
  }

  setMix(mix: number): void {
    this.dryGain.gain.setValueAtTime(1 - mix, this.ctx.currentTime);
    this.wetGain.gain.setValueAtTime(mix, this.ctx.currentTime);
  }

  update(decay: number, mix: number): void {
    this.setDecay(decay);
    this.setMix(mix);
  }

  disconnect(): void {
    this.convolver.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
  }
}
