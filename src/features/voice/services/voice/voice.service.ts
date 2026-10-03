import type { ArgusMic } from 'argus-mic';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { synchronizeService } from '@/core/services/sync';
import type { IVoiceReactionPayload } from '@/core/interfaces';
import { useAvatarStore } from '@/features/voice/stores/avatar.store';
import { VOICE_ACTION_TYPE, VOICE_ANSWER_TYPE, VOICE_ASSISTANT_TYPE, VOICE_CONTEXT_TYPE, VOICE_DONE_TYPE, VOICE_EVENT_TYPE, VOICE_INTERRUPTED_TYPE, VOICE_MIC_FRAME_MS, VOICE_MODE_DUPLEX, VOICE_SAMPLE_RATE, VOICE_SKIP_TYPE, VOICE_START_TYPE, VOICE_STOP_TYPE, VOICE_STT_TYPE, VOICE_TRANSCRIPT_MAX_LINES, VOICE_TURN_TYPE } from '@/features/voice/constants/voice';
import { VOICE_ERROR_TYPE } from '@/shared/constants';
import { concatPcm, pcmChunk } from '@/features/voice/model/pcm';
import type { VoiceAction, VoiceContext, VoicePhase, VoiceSnapshot, VoiceTranscriptLine } from '@/core/types';
import { log } from '@/core/services/log';
import { createArgusMic } from './voice-mic';
import { parseAssistantText, parseSttFrame, parseTurnId, parseVoiceAction, parseVoiceError } from '@/features/voice/services/voice/voice-frames';
import { VoicePlayout } from '@/features/voice/services/voice/voice-playout';
import { appendAssistantText, appendUserLine, lastAssistantText } from '@/features/voice/services/voice/voice-transcript';
import {
  INITIAL_TURN_GATE,
  assistantTurnKey,
  gateAcceptsAudio,
  gateOnInterrupted,
  gateOnSkip,
  gateOnTurn,
  gateOnUserFinal,
  shouldSendMic,
  type TurnGate,
} from '@/features/voice/services/voice/voice-turn-gate';

type Listener = () => void;
type ActionListener = (action: VoiceAction) => void;

const MIC_FRAME_SAMPLES = (VOICE_SAMPLE_RATE * VOICE_MIC_FRAME_MS) / 1000;
const SOCKET_CHECK_INTERVAL_MS = 1000;

const devLog = (...args: unknown[]): void => log.debug('voice', ...args);

class VoiceService {
  private mic: ArgusMic | null = null;
  private capturing = false;
  private active = false;
  private session = 0;
  private phase: VoicePhase = 'idle';
  private sttText = '';
  private transcript: readonly VoiceTranscriptLine[] = [];
  private muted = false;
  private error: string | null = null;
  private gate: TurnGate = INITIAL_TURN_GATE;
  private localTurn = 0;
  private userLines = 0;
  private micPending: Int16Array[] = [];
  private micPendingSamples = 0;
  private lastSocketCheckAt = 0;
  private readonly playout = new VoicePlayout(() => this.handlePlayoutIdle());
  private listeners = new Set<Listener>();
  private actionListeners = new Set<ActionListener>();
  private snapshotValue: VoiceSnapshot = this.buildSnapshot();

  constructor() {
    this.bindSocket();
  }

  get snapshot(): VoiceSnapshot {
    return this.snapshotValue;
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
    return this.snapshotValue.assistantText;
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
    this.session += 1;
    const session = this.session;
    this.active = true;
    this.phase = 'connecting';
    this.sttText = '';
    this.transcript = [];
    this.muted = false;
    this.error = null;
    this.gate = INITIAL_TURN_GATE;
    this.localTurn = 0;
    this.userLines = 0;
    this.resetMicPending();
    this.playout.stop();
    this.notify();

    const connected = await synchronizeService.ensureConnected();
    if (!this.isCurrent(session)) return;
    if (!connected) {
      this.fail('SOCKET_UNAVAILABLE|Unable to connect to Argus');
      return;
    }
    synchronizeService.send(VOICE_START_TYPE, { mode: VOICE_MODE_DUPLEX });

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!this.isCurrent(session)) return;
      if (!granted) {
        this.fail('MIC_PERMISSION_DENIED|Microphone permission denied');
        return;
      }
      const mic = this.mic ?? createArgusMic();
      this.mic = mic;
      mic.onData = (pcm) => {
        if (pcm != null) this.handleMicData(pcm);
      };
      mic.onError = (code, message) => {
        devLog('native error:', code, message);
        this.fail(`${code}|${message}`);
      };
      mic.start(VOICE_SAMPLE_RATE);
      this.capturing = true;
      this.playout.attach(mic);
      if (!this.isCurrent(session)) return;
      if (this.phase === 'connecting') this.phase = 'listening';
      this.notify();
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : String(reason);
      devLog('start failed:', raw);
      this.fail(raw.startsWith('NOT_SUPPORTED') ? raw : `MIC_UNAVAILABLE|${raw}`);
    }
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    synchronizeService.send(VOICE_STOP_TYPE);
    this.stopCapture();
    this.playout.stop();
    if (this.phase !== 'error' && this.phase !== 'done') this.phase = 'idle';
    this.notify();
  }

  interrupt(): void {
    synchronizeService.send(VOICE_SKIP_TYPE);
    this.gate = gateOnSkip(this.gate);
    this.playout.flush();
    if (this.active && this.phase === 'speaking') this.phase = 'listening';
    this.notify();
  }

  skip(): void {
    this.interrupt();
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.resetMicPending();
    this.notify();
  }

  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => {
      this.actionListeners.delete(listener);
    };
  }

  sendContext(context: VoiceContext): void {
    if (!this.active) return;
    synchronizeService.send(VOICE_CONTEXT_TYPE, context);
  }

  answer(text: string): void {
    synchronizeService.send(VOICE_ANSWER_TYPE, { text });
  }

  setThinking(): void {
    this.phase = 'thinking';
    this.notify();
  }

  private isCurrent(session: number): boolean {
    return this.active && this.session === session;
  }

  private handleMicData(pcm: ArrayBuffer): void {
    if (!this.active) return;
    const now = Date.now();
    if (now - this.lastSocketCheckAt > SOCKET_CHECK_INTERVAL_MS) {
      this.lastSocketCheckAt = now;
      if (!synchronizeService.isSocketConnected) {
        this.fail('SOCKET_LOST|Connection to Argus lost');
        return;
      }
    }
    const send = shouldSendMic({
      muted: this.muted,
      turnAware: this.gate.turnAware,
      playing: this.playout.isPlaying,
    });
    if (!send) {
      this.resetMicPending();
      return;
    }
    const samples = pcmChunk(pcm);
    this.micPending.push(samples);
    this.micPendingSamples += samples.length;
    if (this.micPendingSamples < MIC_FRAME_SAMPLES) return;
    const merged = concatPcm(this.micPending, this.micPendingSamples);
    this.resetMicPending();
    synchronizeService.sendBinary(merged.buffer);
  }

  private handleTts(data: ArrayBuffer): void {
    if (!gateAcceptsAudio(this.gate)) return;
    if (!this.active && !this.playout.isPlaying) return;
    this.playout.write(data);
    if (this.active && this.phase !== 'speaking') {
      this.phase = 'speaking';
      this.notify();
    }
  }

  private handlePlayoutIdle(): void {
    if (!this.active || this.phase !== 'speaking') return;
    this.phase = 'listening';
    this.notify();
  }

  private bindSocket(): void {
    synchronizeService.onType(VOICE_STT_TYPE, (payload) => {
      const frame = parseSttFrame(payload);
      if (!frame) return;
      this.sttText = frame.text;
      if (frame.final && frame.text.trim()) {
        this.userLines += 1;
        this.transcript = appendUserLine(
          this.transcript,
          { id: `user-${this.userLines}`, text: frame.text },
          VOICE_TRANSCRIPT_MAX_LINES,
        );
        this.gate = gateOnUserFinal(this.gate);
        this.localTurn += 1;
        if (this.active && this.phase === 'listening') this.phase = 'thinking';
      }
      this.notify();
    });
    synchronizeService.onType(VOICE_EVENT_TYPE, (payload) => {
      const p = payload as IVoiceReactionPayload;
      useAvatarStore.getState().react(p.reaction, p.intensity ?? 0);
    });
    synchronizeService.onType(VOICE_TURN_TYPE, (payload) => {
      const id = parseTurnId(payload);
      if (id === null) return;
      this.gate = gateOnTurn(id);
    });
    synchronizeService.onType(VOICE_INTERRUPTED_TYPE, (payload) => {
      const outcome = gateOnInterrupted(this.gate, parseTurnId(payload));
      this.gate = outcome.gate;
      if (!outcome.flush) return;
      this.playout.flush();
      if (this.active && (this.phase === 'speaking' || this.phase === 'thinking')) this.phase = 'listening';
      this.notify();
    });
    synchronizeService.onType(VOICE_ASSISTANT_TYPE, (payload) => {
      const text = parseAssistantText(payload);
      if (text === null || !gateAcceptsAudio(this.gate)) return;
      this.transcript = appendAssistantText(
        this.transcript,
        { turnKey: assistantTurnKey(this.gate, this.localTurn), text },
        VOICE_TRANSCRIPT_MAX_LINES,
      );
      if (this.active && this.phase === 'thinking') this.phase = 'speaking';
      if (!this.playout.isPlaying) this.playout.armIdle();
      this.notify();
    });
    synchronizeService.onType(VOICE_ACTION_TYPE, (payload) => {
      const action = parseVoiceAction(payload);
      if (!action || !this.active) return;
      for (const listener of this.actionListeners) listener(action);
    });
    synchronizeService.onType(VOICE_DONE_TYPE, () => {
      this.phase = 'done';
      this.active = false;
      this.stopCapture();
      this.playout.drainThenStop();
      this.notify();
    });
    synchronizeService.onType(VOICE_ERROR_TYPE, (payload) => {
      this.fail(parseVoiceError(payload));
    });
    synchronizeService.onBinary((data) => this.handleTts(data));
  }

  private stopCapture(): void {
    this.resetMicPending();
    if (!this.capturing || !this.mic) return;
    this.capturing = false;
    this.mic.stop();
  }

  private resetMicPending(): void {
    this.micPending = [];
    this.micPendingSamples = 0;
  }

  private fail(message: string): void {
    devLog('fail:', message);
    this.error = message;
    this.phase = 'error';
    this.active = false;
    this.stopCapture();
    this.playout.stop();
    this.notify();
  }

  private buildSnapshot(): VoiceSnapshot {
    return {
      phase: this.phase,
      isActive: this.active,
      muted: this.muted,
      sttText: this.sttText,
      assistantText: lastAssistantText(this.transcript),
      transcript: this.transcript,
      error: this.error,
    };
  }

  private notify(): void {
    this.snapshotValue = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}

export const voiceService = new VoiceService();
