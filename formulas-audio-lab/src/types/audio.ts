/**
 * Messages sent to formula generator worklet
 */
export type WorkletMessage =
  | { type: 'set'; params: Record<string, number> }
  | { type: 'reset' };

/**
 * Messages sent to recorder worklet
 */
export type RecorderMessage =
  | { type: 'start' }
  | { type: 'stop' };

/**
 * Messages received from recorder worklet
 */
export interface RecorderDataMessage {
  type: 'data';
  samples: Float32Array;
}

/**
 * Audio engine events
 */
export interface AudioEngineEvents {
  start: void;
  stop: void;
  'recording-start': void;
  'recording-stop': Blob;
}

/**
 * Generator node wrapper containing worklet and gain
 */
export interface GeneratorNode {
  /** The AudioWorkletNode */
  worklet: AudioWorkletNode;
  /** Gain node for enabling/disabling */
  gain: GainNode;
  /** Current parameter values */
  params: Record<string, number>;
}
