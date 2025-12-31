/**
 * Chorus/Flanger effect
 * Modulated delay with feedback
 */
export class Chorus {
  private delay: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private feedbackGain: GainNode;

  constructor(private ctx: AudioContext) {
    this.delay = ctx.createDelay(0.2);
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.feedbackGain = ctx.createGain();

    this.lfo = ctx.createOscillator();
    this.lfoGain = ctx.createGain();
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    this.lfo.start();
  }

  get dry(): GainNode {
    return this.dryGain;
  }

  get wet(): GainNode {
    return this.wetGain;
  }

  get delayNode(): DelayNode {
    return this.delay;
  }

  get feedback(): GainNode {
    return this.feedbackGain;
  }

  setMode(mode: 'chorus' | 'flanger'): void {
    const baseMs = mode === 'flanger' ? 2.0 : 12.0;
    this.delay.delayTime.setValueAtTime(baseMs / 1000, this.ctx.currentTime);
  }

  setRate(rate: number): void {
    this.lfo.frequency.setValueAtTime(rate, this.ctx.currentTime);
  }

  setDepth(depthMs: number): void {
    this.lfoGain.gain.setValueAtTime(depthMs / 1000, this.ctx.currentTime);
  }

  setMix(mix: number): void {
    this.dryGain.gain.setValueAtTime(1 - mix, this.ctx.currentTime);
    this.wetGain.gain.setValueAtTime(mix, this.ctx.currentTime);
  }

  setFeedback(fb: number): void {
    this.feedbackGain.gain.setValueAtTime(fb, this.ctx.currentTime);
  }

  update(
    mode: 'chorus' | 'flanger',
    rate: number,
    depthMs: number,
    mix: number,
    feedback: number
  ): void {
    this.setMode(mode);
    this.setRate(rate);
    this.setDepth(depthMs);
    this.setMix(mix);
    this.setFeedback(feedback);
  }

  disconnect(): void {
    this.delay.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.feedbackGain.disconnect();
  }

  stop(): void {
    try {
      this.lfo.stop();
    } catch {
      // Already stopped
    }
  }
}
