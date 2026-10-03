import type { IVoiceRecorder } from '@/core/interfaces';
import type { VoiceRecording } from '@/core/types';
import { encodeWav, floatToPcm16, levelOf, MODEL_SAMPLE_RATE, toBase64 } from '../model/wav';

const CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
};

function recorderError(error: unknown): Error {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError'
    ? new Error('MIC_PERMISSION_DENIED|Microphone permission denied')
    : new Error('MIC_UNAVAILABLE|The microphone could not be opened');
}

async function toModelRate(context: AudioContext, recorded: Blob): Promise<Float32Array> {
  const decoded = await context.decodeAudioData(await recorded.arrayBuffer());
  const frames = Math.max(1, Math.ceil(decoded.duration * MODEL_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, MODEL_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

class WebVoiceRecorder implements IVoiceRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private frame = 0;

  supported(): Promise<boolean> {
    return Promise.resolve(
      typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined' &&
        typeof AudioContext !== 'undefined' &&
        typeof OfflineAudioContext !== 'undefined',
    );
  }

  async start(onLevel: (level: number) => void): Promise<void> {
    this.cancel();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: CAPTURE_CONSTRAINTS });
    } catch (error) {
      throw recorderError(error);
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(this.stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const meter = () => {
      analyser.getFloatTimeDomainData(buffer);
      onLevel(levelOf(buffer));
      this.frame = requestAnimationFrame(meter);
    };
    this.frame = requestAnimationFrame(meter);

    const recorder = new MediaRecorder(this.stream);
    this.chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    recorder.start();
    this.context = context;
    this.recorder = recorder;
  }

  async stop(): Promise<VoiceRecording> {
    const recorder = this.recorder;
    const context = this.context;
    if (!recorder || !context) throw new Error('MIC_UNAVAILABLE|Nothing is being recorded');
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    const recorded = new Blob(this.chunks, { type: recorder.mimeType });
    try {
      const samples = floatToPcm16(await toModelRate(context, recorded));
      return {
        audio: toBase64(encodeWav(samples, MODEL_SAMPLE_RATE)),
        seconds: samples.length / MODEL_SAMPLE_RATE,
      };
    } finally {
      this.cancel();
    }
  }

  cancel(): void {
    cancelAnimationFrame(this.frame);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.recorder = null;
    this.stream = null;
    this.context = null;
    this.chunks = [];
  }
}

export const voiceRecorder: IVoiceRecorder = new WebVoiceRecorder();
