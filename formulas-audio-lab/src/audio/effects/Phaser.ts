/**
 * Phaser effect
 * Chain of all-pass filters with LFO modulation
 */
export class Phaser {
  private filters: BiquadFilterNode[] = [];
  private lfo: OscillatorNode;
  private lfoGains: GainNode[] = [];
  private dryGain: GainNode;
  private wetGain: GainNode;
  private feedbackGain: GainNode;
  private inputGain: GainNode;
  private outputGain: GainNode;

  private static readonly MAX_STAGES = 8;

  constructor(private ctx: AudioContext) {
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.feedbackGain = ctx.createGain();
    this.inputGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.start();

    // Create max stages (we'll use a subset based on setting)
    for (let i = 0; i < Phaser.MAX_STAGES; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;
      this.filters.push(filter);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1500;
      this.lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.lfoGains.push(lfoGain);
    }
  }

  get dry(): GainNode {
    return this.dryGain;
  }

  get wet(): GainNode {
    return this.wetGain;
  }

  get feedback(): GainNode {
    return this.feedbackGain;
  }

  get input(): GainNode {
    return this.inputGain;
  }

  get output(): GainNode {
    return this.outputGain;
  }

  get allFilters(): BiquadFilterNode[] {
    return this.filters;
  }

  setRate(rate: number): void {
    this.lfo.frequency.setValueAtTime(rate, this.ctx.currentTime);
  }

  setDepth(depth: number): void {
    const freqRange = 3000 * depth;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.lfoGains[i].gain.setValueAtTime(freqRange, this.ctx.currentTime);
    }
  }

  setFeedback(fb: number): void {
    this.feedbackGain.gain.setValueAtTime(fb, this.ctx.currentTime);
  }

  setMix(mix: number): void {
    this.dryGain.gain.setValueAtTime(1 - mix, this.ctx.currentTime);
    this.wetGain.gain.setValueAtTime(mix, this.ctx.currentTime);
  }

  update(
    rate: number,
    depth: number,
    _stages: number,
    feedback: number,
    mix: number
  ): void {
    this.setRate(rate);
    this.setDepth(depth);
    this.setFeedback(feedback);
    this.setMix(mix);
  }

  disconnect(): void {
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.feedbackGain.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    for (const f of this.filters) {
      f.disconnect();
    }
  }

  stop(): void {
    try {
      this.lfo.stop();
    } catch {
      // Already stopped
    }
  }
}
