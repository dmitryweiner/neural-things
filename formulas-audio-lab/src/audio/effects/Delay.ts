/**
 * Delay/Echo effect
 */
export class Delay {
  private delay: DelayNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private feedbackGain: GainNode;

  constructor(private ctx: AudioContext) {
    this.delay = ctx.createDelay(3.0);
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.feedbackGain = ctx.createGain();
  }

  get delayNode(): DelayNode {
    return this.delay;
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

  setTime(time: number): void {
    this.delay.delayTime.setValueAtTime(time, this.ctx.currentTime);
  }

  setFeedback(fb: number): void {
    this.feedbackGain.gain.setValueAtTime(fb, this.ctx.currentTime);
  }

  setMix(mix: number): void {
    this.dryGain.gain.setValueAtTime(1 - mix, this.ctx.currentTime);
    this.wetGain.gain.setValueAtTime(mix, this.ctx.currentTime);
  }

  update(time: number, feedback: number, mix: number): void {
    this.setTime(time);
    this.setFeedback(feedback);
    this.setMix(mix);
  }

  disconnect(): void {
    this.delay.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.feedbackGain.disconnect();
  }
}
