/**
 * Recorder AudioWorklet Processor
 * Captures raw PCM samples for WAV export
 */

type RecorderMessage = { type: 'start' } | { type: 'stop' };

class RecorderProcessor extends AudioWorkletProcessor {
  private recording: boolean = false;
  private chunks: Float32Array[] = [];

  constructor() {
    super();

    this.port.onmessage = (e: MessageEvent<RecorderMessage>) => {
      if (e.data.type === 'start') {
        this.recording = true;
        this.chunks = [];
      } else if (e.data.type === 'stop') {
        this.recording = false;
        const totalLength = this.chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        this.port.postMessage({ type: 'data', samples: result });
        this.chunks = [];
      }
    };
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];

    // Pass through audio (keeps node active in audio graph)
    if (input && input[0] && output && output[0]) {
      output[0].set(input[0]);

      // Record if active
      if (this.recording) {
        this.chunks.push(new Float32Array(input[0]));
      }
    }

    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
