import type { ArgusMic } from 'argus-mic';
import { File, Paths } from 'expo-file-system';
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  type AudioPlayer,
} from 'expo-audio';
import { synchronizeService } from '@/core/services/sync';
import type {
  IVoiceAssistantPayload,
  IVoiceDonePayload,
  IVoiceErrorPayload,
  IVoiceReactionPayload,
  IVoiceSttPayload,
} from '@/core/interfaces';
import { useAvatarStore } from '@/core/stores';
import {
  VOICE_ANSWER_TYPE,
  VOICE_ASSISTANT_TYPE,
  VOICE_DONE_TYPE,
  VOICE_ENVELOPE_ATTACK_MS,
  VOICE_ENVELOPE_RELEASE_MS,
  VOICE_ENVELOPE_WINDOW_MS,
  VOICE_ERROR_TYPE,
  VOICE_EVENT_TYPE,
  VOICE_SAMPLE_RATE,
  VOICE_SKIP_TYPE,
  VOICE_START_TYPE,
  VOICE_STOP_TYPE,
  VOICE_STT_TYPE,
  VOICE_TTS_WATCHDOG_MS,
} from '@/shared/constants';
import { pcmChunk, pcmToWav } from '@/shared/libs/pcm';
import { pcmEnvelope, voiceLevel } from '@/shared/libs/voice-level';
import { withTiming } from 'react-native-reanimated';
import { createArgusMic } from './voice-mic';
import type { VoicePhase } from '@/core/types';
import { log } from '@/core/services/log';

type Listener = () => void;

const MIC_LOG_INTERVAL_MS = 500;
const MIC_FRAME_SAMPLES = (VOICE_SAMPLE_RATE * 100) / 1000;

let ttsSequence = 0;

function rmsOf(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] / 32768;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

const devLog = (...args: unknown[]): void => log.debug('voice', ...args);

class VoiceService {
  private mic: ArgusMic | null = null;
  private active = false;
  private phase: VoicePhase = 'idle';
  private sttText = '';
  private assistantText = '';
  private error: string | null = null;
  private ttsBuffer: Int16Array[] = [];
  private ttsSize = 0;
  private micPending: Int16Array[] = [];
  private micPendingSamples = 0;
  private micPausedForTts = false;
  private ttsChain: Promise<void> = Promise.resolve();
  private ttsQueueDepth = 0;
  private players = new Set<AudioPlayer>();
  private unsubscribers: (() => void)[] = [];
  private listeners = new Set<Listener>();
  private micChunks = 0;
  private lastMicLogAt = 0;
  private lastPeakRms = 0;
  private lastSocketCheckAt = 0;

  constructor() {
    this.bindSocket();
  }

  get isActive(): boolean {
    return this.active;
  }

  get phaseValue(): VoicePhase {
    return this.phase;
  }

  get sttTextValue(): string {
    return this.sttText;
  }

  get assistantTextValue(): string {
    return this.assistantText;
  }

  get errorValue(): string | null {
    return this.error;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.phase = 'listening';
    this.sttText = '';
    this.assistantText = '';
    this.error = null;
    this.micChunks = 0;
    this.lastPeakRms = 0;
    this.ttsBuffer = [];
    this.ttsSize = 0;
    this.micPending = [];
    this.micPendingSamples = 0;
    this.micPausedForTts = false;
    this.ttsQueueDepth = 0;
    this.ttsChain = Promise.resolve();
    this.players.clear();
    this.notify();

    const connected = await synchronizeService.ensureConnected();
    if (!this.active) return;
    if (!connected) {
      this.fail('SOCKET_UNAVAILABLE|Unable to connect to Argus');
      return;
    }
    devLog('start: sending voice:start, socket connected?', synchronizeService.isSocketConnected);
    synchronizeService.send(VOICE_START_TYPE);

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      devLog('start: mic permission granted?', granted);
      if (!this.active) return;
      if (!granted) {
        this.fail('MIC_PERMISSION_DENIED|Microphone permission denied');
        return;
      }
      const mic = createArgusMic();
      this.mic = mic;
      mic.onData = (pcm) => {
        if (pcm == null) return;
        const now = Date.now();
        if (now - this.lastSocketCheckAt > 1000) {
          this.lastSocketCheckAt = now;
          if (!synchronizeService.isSocketConnected) {
            devLog('mic: socket lost while recording -> fail');
            this.fail('SOCKET_LOST|Connection to Argus lost');
            return;
          }
        }
        this.micChunks += 1;
        const samples = pcmChunk(pcm);
        const rms = rmsOf(samples);
        if (rms > this.lastPeakRms) this.lastPeakRms = rms;
        if (now - this.lastMicLogAt >= MIC_LOG_INTERVAL_MS) {
          devLog(
            'mic: chunks=',
            this.micChunks,
            'bytes=',
            pcm.byteLength,
            'rms=',
            rms.toFixed(3),
            'peak=',
            this.lastPeakRms.toFixed(3),
          );
          this.lastMicLogAt = now;
          this.lastPeakRms = 0;
        }
        this.micPending.push(samples);
        this.micPendingSamples += samples.length;
        if (this.micPendingSamples >= MIC_FRAME_SAMPLES) {
          const total = this.micPendingSamples;
          const merged = new Int16Array(total);
          let offset = 0;
          for (const part of this.micPending) {
            merged.set(part, offset);
            offset += part.length;
          }
          this.micPending = [];
          this.micPendingSamples = 0;
          synchronizeService.sendBinary(merged.buffer);
        }
      };
      mic.onError = (code, message) => {
        devLog('mic error:', code, message);
        this.fail(`${code}|${message}`);
      };
      mic.start(VOICE_SAMPLE_RATE);
      devLog('start: mic started at', VOICE_SAMPLE_RATE);
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : String(reason);
      devLog('start: exception:', raw);
      this.fail(raw.startsWith('NOT_SUPPORTED') ? raw : `MIC_UNAVAILABLE|${raw}`);
    }
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    synchronizeService.send(VOICE_STOP_TYPE);
    this.teardownMic();
    this.notify();
  }

  skip(): void {
    devLog('skip: interrupting TTS playback');
    for (const player of this.players) player.pause();
    this.players.clear();
    this.ttsBuffer = [];
    this.ttsSize = 0;
    this.ttsQueueDepth = 0;
    this.ttsChain = Promise.resolve();
    this.resumeMicAfterTts();
    synchronizeService.send(VOICE_SKIP_TYPE);
  }

  answer(text: string): void {
    synchronizeService.send(VOICE_ANSWER_TYPE, { text });
  }

  setThinking(): void {
    this.phase = 'thinking';
    this.notify();
  }

  private bindSocket(): void {
    this.unsubscribers.push(
      synchronizeService.onType(VOICE_STT_TYPE, (payload) => {
        const p = payload as IVoiceSttPayload;
        devLog('event voice:stt ->', JSON.stringify(p));
        this.sttText = p.text;
        this.notify();
      }),
      synchronizeService.onType(VOICE_EVENT_TYPE, (payload) => {
        const p = payload as IVoiceReactionPayload;
        devLog('event voice:event ->', JSON.stringify(p));
        useAvatarStore.getState().react(p.reaction, p.intensity ?? 0);
      }),
      synchronizeService.onType(VOICE_ASSISTANT_TYPE, (payload) => {
        const p = payload as IVoiceAssistantPayload;
        devLog('event voice:assistant ->', JSON.stringify(p));
        this.assistantText = p.text;
        this.flushTts();
        this.phase = 'speaking';
        this.notify();
      }),
      synchronizeService.onType(VOICE_DONE_TYPE, (payload) => {
        const p = payload as IVoiceDonePayload;
        devLog('event voice:done ->', JSON.stringify(p));
        this.flushTts();
        this.phase = 'done';
        this.active = false;
        this.teardownMic();
        this.notify();
        void p;
      }),      synchronizeService.onType(VOICE_ERROR_TYPE, (payload) => {
        const p = payload as IVoiceErrorPayload;
        devLog('event voice:error ->', JSON.stringify(p));
        this.fail(p.error ?? `VOICE_ERROR|${p.status ?? ''}`.trim());
      }),
      synchronizeService.onBinary((data) => {
        const samples = pcmChunk(data);
        this.ttsBuffer.push(samples);
        this.ttsSize += samples.length;
        this.pauseMicForTts();
      }),
    );
  }

  private flushTts(): void {
    this.ttsChain = this.ttsChain
      .then(() => this.doFlushTts())
      .catch((reason) => {
        devLog('tts flush: FAILED', reason);
        this.ttsQueueDepth = 0;
        this.resumeMicAfterTts();
      });
  }

  private async doFlushTts(): Promise<void> {
    if (this.ttsBuffer.length === 0) return;
    const total = this.ttsSize;
    const merged = new Int16Array(total);
    let offset = 0;
    for (const chunk of this.ttsBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.ttsBuffer = [];
    this.ttsSize = 0;

    const wav = pcmToWav(merged, VOICE_SAMPLE_RATE);
    const file = new File(Paths.cache, `argus-tts-${Date.now()}-${ttsSequence++}.wav`);
    const writer = file.writableStream().getWriter();
    await writer.write(new Uint8Array(wav));
    await writer.close();
    devLog('tts flush: wav bytes=', wav.byteLength, 'uri=', (file as unknown as { uri: string }).uri);

    this.ttsQueueDepth += 1;
    this.pauseMicForTts();
    const stopEnvelope = this.driveVoiceEnvelope(merged);
    const player = createAudioPlayer((file as unknown as { uri: string }).uri);
    this.players.add(player);
    const watchdog = setTimeout(() => {
      devLog('tts flush: watchdog — resuming mic');
      stopEnvelope();
      player.pause();
      this.players.delete(player);
      this.ttsQueueDepth = Math.max(0, this.ttsQueueDepth - 1);
      if (this.ttsQueueDepth === 0) this.resumeMicAfterTts();
    }, VOICE_TTS_WATCHDOG_MS);
    await new Promise<void>((resolve) => {
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          devLog('tts flush: playback finished');
          subscription.remove();
          clearTimeout(watchdog);
          stopEnvelope();
          resolve();
        }
      });
      player.play();
    });
    this.players.delete(player);
    this.ttsQueueDepth -= 1;
    if (this.ttsQueueDepth === 0) this.resumeMicAfterTts();
  }

  private driveVoiceEnvelope(samples: Int16Array): () => void {
    const windowSamples = Math.max(
      1,
      Math.round((VOICE_SAMPLE_RATE * VOICE_ENVELOPE_WINDOW_MS) / 1000)
    );
    const envelope = pcmEnvelope(samples, windowSamples);
    if (envelope.length === 0) {
      return () => {};
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const index = Math.floor((Date.now() - startedAt) / VOICE_ENVELOPE_WINDOW_MS);
      if (index >= envelope.length) {
        voiceLevel.value = withTiming(0, { duration: VOICE_ENVELOPE_RELEASE_MS });
        return;
      }
      const target = envelope[index];
      const duration =
        target >= voiceLevel.value ? VOICE_ENVELOPE_ATTACK_MS : VOICE_ENVELOPE_RELEASE_MS;
      voiceLevel.value = withTiming(target, { duration });
    }, VOICE_ENVELOPE_WINDOW_MS);

    return () => {
      clearInterval(timer);
      voiceLevel.value = withTiming(0, { duration: VOICE_ENVELOPE_RELEASE_MS });
    };
  }

  private pauseMicForTts(): void {
    if (this.micPausedForTts) return;
    this.micPausedForTts = true;
    if (this.mic) {
      devLog('mic: paused for TTS');
      this.mic.stop();
    }
  }

  private resumeMicAfterTts(): void {
    if (!this.micPausedForTts) return;
    this.micPausedForTts = false;
    if (!this.active) return;
    try {
      if (this.mic) {
        this.mic.start(VOICE_SAMPLE_RATE);
        devLog('mic: resumed after TTS');
      }
    } catch (reason) {
      devLog('mic: resume failed', reason);
    }
  }

  private teardownMic(): void {
    if (this.mic) {
      this.mic.stop();
      this.mic = null;
    }
  }

  private fail(message: string): void {
    this.error = message;
    this.phase = 'error';
    this.active = false;
    this.teardownMic();
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const voiceService = new VoiceService();
