/**
 * Limiter effect (DynamicsCompressor in limiter mode)
 */
export class Limiter {
  private compressor: DynamicsCompressorNode;

  constructor(private ctx: AudioContext) {
    this.compressor = ctx.createDynamicsCompressor();
    // Fixed limiter settings
    this.compressor.ratio.value = 20;
    this.compressor.attack.value = 0.003;
    this.compressor.knee.value = 0;
  }

  get input(): AudioNode {
    return this.compressor;
  }

  get output(): AudioNode {
    return this.compressor;
  }

  setThreshold(threshold: number): void {
    this.compressor.threshold.setValueAtTime(threshold, this.ctx.currentTime);
  }

  setRelease(release: number): void {
    this.compressor.release.setValueAtTime(release, this.ctx.currentTime);
  }

  update(threshold: number, release: number): void {
    this.setThreshold(threshold);
    this.setRelease(release);
  }

  disconnect(): void {
    this.compressor.disconnect();
  }
}
