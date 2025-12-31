import { Filter } from './Filter';
import { Chorus } from './Chorus';
import { Reverb } from './Reverb';
import { Limiter } from './Limiter';
import { Delay } from './Delay';
import { Phaser } from './Phaser';
import type { EffectsState } from '../../types';

/**
 * Manages the complete effects chain
 * Handles routing and parameter updates
 */
export class EffectsChain {
  public readonly filter: Filter;
  public readonly chorus: Chorus;
  public readonly reverb: Reverb;
  public readonly limiter: Limiter;
  public readonly delay: Delay;
  public readonly phaser: Phaser;

  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(private ctx: AudioContext) {
    this.filter = new Filter(ctx);
    this.chorus = new Chorus(ctx);
    this.reverb = new Reverb(ctx);
    this.limiter = new Limiter(ctx);
    this.delay = new Delay(ctx);
    this.phaser = new Phaser(ctx);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
  }

  get input(): GainNode {
    return this.inputNode;
  }

  get output(): GainNode {
    return this.outputNode;
  }

  /**
   * Rebuild the effects routing based on enabled state
   */
  rebuild(state: EffectsState): void {
    // Disconnect all nodes first
    this.disconnectAll();

    let node: AudioNode = this.inputNode;

    // Filter
    if (state.filterOn) {
      node.connect(this.filter.input);
      node = this.filter.output;
    }

    // Chorus
    if (state.chorusOn) {
      node.connect(this.chorus.dry);
      node.connect(this.chorus.delayNode);
      this.chorus.delayNode.connect(this.chorus.feedback);
      this.chorus.feedback.connect(this.chorus.delayNode);
      this.chorus.delayNode.connect(this.chorus.wet);

      const chorusSum = this.ctx.createGain();
      this.chorus.dry.connect(chorusSum);
      this.chorus.wet.connect(chorusSum);
      node = chorusSum;
    }

    // Phaser
    if (state.phaserOn) {
      node.connect(this.phaser.dry);
      node.connect(this.phaser.input);

      // Connect phaser filter chain
      let pNode: AudioNode = this.phaser.input;
      for (const f of this.phaser.allFilters) {
        pNode.connect(f);
        pNode = f;
      }
      pNode.connect(this.phaser.output);
      this.phaser.output.connect(this.phaser.feedback);
      this.phaser.feedback.connect(this.phaser.input);
      this.phaser.output.connect(this.phaser.wet);

      const phaserSum = this.ctx.createGain();
      this.phaser.dry.connect(phaserSum);
      this.phaser.wet.connect(phaserSum);
      node = phaserSum;
    }

    // Delay
    if (state.delayOn) {
      node.connect(this.delay.dry);
      node.connect(this.delay.delayNode);
      this.delay.delayNode.connect(this.delay.feedback);
      this.delay.feedback.connect(this.delay.delayNode);
      this.delay.delayNode.connect(this.delay.wet);

      const delaySum = this.ctx.createGain();
      this.delay.dry.connect(delaySum);
      this.delay.wet.connect(delaySum);
      node = delaySum;
    }

    // Reverb
    if (state.reverbOn) {
      node.connect(this.reverb.dry);
      node.connect(this.reverb.convolverNode);
      this.reverb.convolverNode.connect(this.reverb.wet);

      const reverbSum = this.ctx.createGain();
      this.reverb.dry.connect(reverbSum);
      this.reverb.wet.connect(reverbSum);
      node = reverbSum;
    }

    // Limiter
    if (state.limiterOn) {
      node.connect(this.limiter.input);
      node = this.limiter.output;
    }

    // Connect to output
    node.connect(this.outputNode);
  }

  /**
   * Update all effect parameters
   */
  updateParams(state: EffectsState): void {
    this.filter.update(state.filterType, state.filterFreq, state.filterQ);
    this.chorus.update(
      state.chorusMode,
      state.chorusRate,
      state.chorusDepth,
      state.chorusMix,
      state.chorusFb
    );
    this.reverb.update(state.reverbDecay, state.reverbMix);
    this.limiter.update(state.limiterThr, state.limiterRel);
    this.delay.update(state.delayTime, state.delayFb, state.delayMix);
    this.phaser.update(
      state.phaserRate,
      state.phaserDepth,
      state.phaserStages,
      state.phaserFb,
      state.phaserMix
    );
  }

  /**
   * Disconnect all effect nodes
   */
  private disconnectAll(): void {
    this.inputNode.disconnect();
    this.filter.disconnect();
    this.chorus.disconnect();
    this.reverb.disconnect();
    this.limiter.disconnect();
    this.delay.disconnect();
    this.phaser.disconnect();
    this.outputNode.disconnect();
  }

  /**
   * Stop all oscillators and clean up
   */
  destroy(): void {
    this.disconnectAll();
    this.chorus.stop();
    this.phaser.stop();
  }
}
