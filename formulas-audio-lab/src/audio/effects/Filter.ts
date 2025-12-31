/**
 * Biquad Filter effect
 */
export class Filter {
  private node: BiquadFilterNode;

  constructor(private ctx: AudioContext) {
    this.node = ctx.createBiquadFilter();
  }

  get input(): AudioNode {
    return this.node;
  }

  get output(): AudioNode {
    return this.node;
  }

  setType(type: BiquadFilterType): void {
    this.node.type = type;
  }

  setFrequency(freq: number): void {
    this.node.frequency.setValueAtTime(freq, this.ctx.currentTime);
  }

  setQ(q: number): void {
    this.node.Q.setValueAtTime(q, this.ctx.currentTime);
  }

  update(type: BiquadFilterType, freq: number, q: number): void {
    this.setType(type);
    this.setFrequency(freq);
    this.setQ(q);
  }

  disconnect(): void {
    this.node.disconnect();
  }
}
