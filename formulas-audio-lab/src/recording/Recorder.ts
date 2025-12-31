import { encodeWAV, generateWAVFilename } from './WAVEncoder';
import type { RecorderDataMessage } from '../types';

/**
 * Audio recorder using AudioWorklet
 */
export class Recorder {
  private recorderNode: AudioWorkletNode | null = null;
  private isRecording = false;
  private sampleRate: number;

  constructor(private ctx: AudioContext) {
    this.sampleRate = ctx.sampleRate;
  }

  /**
   * Initialize the recorder worklet node
   */
  async init(): Promise<AudioWorkletNode> {
    // Load recorder worklet
    const workletUrl = new URL(
      '../audio/worklets/recorder.worklet.ts',
      import.meta.url
    );
    await this.ctx.audioWorklet.addModule(workletUrl);

    this.recorderNode = new AudioWorkletNode(this.ctx, 'recorder-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    return this.recorderNode;
  }

  /**
   * Get the recorder node (for connecting to audio graph)
   */
  get node(): AudioWorkletNode | null {
    return this.recorderNode;
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Start recording
   */
  start(): void {
    if (!this.recorderNode) {
      throw new Error('Recorder not initialized');
    }
    this.isRecording = true;
    this.recorderNode.port.postMessage({ type: 'start' });
  }

  /**
   * Stop recording and return WAV blob
   */
  async stop(): Promise<{ blob: Blob; filename: string }> {
    if (!this.recorderNode || !this.isRecording) {
      throw new Error('Not recording');
    }

    return new Promise((resolve) => {
      this.recorderNode!.port.onmessage = (
        e: MessageEvent<RecorderDataMessage>
      ) => {
        if (e.data.type === 'data') {
          this.isRecording = false;
          const blob = encodeWAV(e.data.samples, this.sampleRate);
          const filename = generateWAVFilename();
          resolve({ blob, filename });
        }
      };

      this.recorderNode!.port.postMessage({ type: 'stop' });
    });
  }

  /**
   * Share recording using Web Share API (mobile)
   */
  async share(blob: Blob, filename: string): Promise<boolean> {
    const file = new File([blob], filename, { type: 'audio/wav' });
    const canShare =
      'share' in navigator &&
      'canShare' in navigator &&
      navigator.canShare({ files: [file] });

    if (canShare) {
      try {
        await navigator.share({
          files: [file],
          title: 'Formula Audio Recording',
        });
        return true;
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          console.warn('Share failed:', error);
        }
      }
    }
    return false;
  }

  /**
   * Download recording as file
   */
  download(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return url;
  }
}
