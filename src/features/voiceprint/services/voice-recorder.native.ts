import { createMic, type ArgusMic } from 'argus-mic';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import type { IVoiceRecorder } from '@/core/interfaces';
import type { VoiceRecording } from '@/core/types';
import { concatPcm, encodeWav, levelOf, MODEL_SAMPLE_RATE, toBase64 } from '../model/wav';

class NativeVoiceRecorder implements IVoiceRecorder {
  private mic: ArgusMic | null = null;
  private chunks: ArrayBuffer[] = [];
  private failure: Error | null = null;

  supported(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async start(onLevel: (level: number) => void): Promise<void> {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) throw new Error('MIC_PERMISSION_DENIED|Microphone permission denied');
    const mic = this.mic ?? createMic();
    this.mic = mic;
    this.chunks = [];
    this.failure = null;
    mic.onData = (pcm) => {
      if (!pcm) return;
      const copy = pcm.slice(0);
      this.chunks.push(copy);
      onLevel(levelOf(new Int16Array(copy)));
    };
    mic.onError = (code, message) => {
      this.failure = new Error(`${code}|${message}`);
    };
    mic.start(MODEL_SAMPLE_RATE);
  }

  stop(): Promise<VoiceRecording> {
    this.release();
    if (this.failure) return Promise.reject(this.failure);
    const samples = concatPcm(this.chunks);
    this.chunks = [];
    return Promise.resolve({
      audio: toBase64(encodeWav(samples, MODEL_SAMPLE_RATE)),
      seconds: samples.length / MODEL_SAMPLE_RATE,
    });
  }

  cancel(): void {
    this.release();
    this.chunks = [];
  }

  private release(): void {
    if (!this.mic) return;
    this.mic.stop();
    this.mic.onData = null;
    this.mic.onError = null;
  }
}

export const voiceRecorder: IVoiceRecorder = new NativeVoiceRecorder();
