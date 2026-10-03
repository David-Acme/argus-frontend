import { requestRecordingPermissionsAsync } from 'expo-audio';
import { synchronizeService } from '@/core/services/sync';
import type { IVoiceMic, IVoiceReactionPayload } from '@/core/interfaces';
import { useAvatarStore } from '@/features/voice/stores/avatar.store';
import {
  CALL_ACTIONS_KEPT,
  VOICE_ACTION_RESULT_TYPE,
  VOICE_ACTION_TYPE,
  VOICE_ASSISTANT_TYPE,
  VOICE_CONTEXT_TYPE,
  VOICE_DONE_TYPE,
  VOICE_EVENT_TYPE,
  VOICE_INTERRUPTED_TYPE,
  VOICE_MIC_FRAME_MS,
  VOICE_MODE_DUPLEX,
  VOICE_MUTE_TYPE,
  VOICE_PREVIOUS_CALL_GRACE_MS,
  VOICE_RESUME_RETRY_MS,
  VOICE_RESUME_WINDOW_MS,
  VOICE_SAMPLE_RATE,
  VOICE_SKIP_TYPE,
  VOICE_START_TYPE,
  VOICE_STOP_TYPE,
  VOICE_STT_TYPE,
  VOICE_TRANSCRIPT_MAX_LINES,
  VOICE_TURN_TYPE,
} from '@/features/voice/constants/voice';
import { VOICE_ERROR_TYPE } from '@/shared/constants';
import { concatPcm, pcmChunk } from '@/features/voice/model/pcm';
import {
  INITIAL_CALL_BOUNDARY,
  boundaryAfterDone,
  boundaryAfterStop,
  boundaryExpired,
  hasAction,
  recordAction,
  settleAction,
  type CallBoundary,
} from '@/features/voice/model/voice-action-log';
import type {
  VoiceAction,
  VoiceActionOutcome,
  VoiceActionRecord,
  VoiceContext,
  VoicePhase,
  VoiceSnapshot,
  VoiceTranscriptLine,
} from '@/core/types';
import { log } from '@/core/services/log';
import { createVoiceMic } from './voice-mic';
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
type FailOptions = { serverGone: boolean };
type ResumeListener = () => void;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MIC_FRAME_SAMPLES = (VOICE_SAMPLE_RATE * VOICE_MIC_FRAME_MS) / 1000;
const SOCKET_CHECK_INTERVAL_MS = 1000;

const devLog = (...args: unknown[]): void => log.debug('voice', ...args);

class VoiceService {
  private mic: IVoiceMic | null = null;
  private capturing = false;
  private active = false;
  private serverSession = false;
  private boundary: CallBoundary = INITIAL_CALL_BOUNDARY;
  private actions: readonly VoiceActionRecord[] = [];
  private liveCameraId: string | null = null;
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
  private resumeListeners = new Set<ResumeListener>();
  private resuming = false;
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
    this.actions = [];
    this.liveCameraId = null;
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
    this.serverSession = true;

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!this.isCurrent(session)) return;
      if (!granted) {
        this.fail('MIC_PERMISSION_DENIED|Microphone permission denied');
        return;
      }
      const mic = this.mic ?? createVoiceMic();
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
    if (!this.active && !this.serverSession) return;
    this.active = false;
    this.endServerSession();
    this.stopCapture();
    this.playout.stop();
    this.liveCameraId = null;
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
    if (this.serverSession) synchronizeService.send(VOICE_MUTE_TYPE, { muted });
    this.notify();
  }

  completeAction(id: string, outcome: VoiceActionOutcome): void {
    const settled = settleAction({ records: this.actions, id, outcome });
    if (settled === this.actions) return;
    this.actions = settled;
    if (this.serverSession) {
      const numeric = Number(id);
      synchronizeService.send(VOICE_ACTION_RESULT_TYPE, {
        id: Number.isSafeInteger(numeric) ? numeric : id,
        ok: outcome.ok,
        detail: outcome.detail ?? '',
      });
    }
    this.notify();
  }

  showCamera(cameraId: string | null): void {
    if (this.liveCameraId === cameraId) return;
    this.liveCameraId = this.active ? cameraId : null;
    this.notify();
  }

  onResumed(listener: ResumeListener): () => void {
    this.resumeListeners.add(listener);
    return () => {
      this.resumeListeners.delete(listener);
    };
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

  setThinking(): void {
    this.phase = 'thinking';
    this.notify();
  }

  private isCurrent(session: number): boolean {
    return this.active && this.session === session;
  }

  private endServerSession(serverGone = false): void {
    if (!this.serverSession) return;
    this.serverSession = false;
    if (serverGone) return;
    synchronizeService.send(VOICE_STOP_TYPE);
    this.boundary = boundaryAfterStop(this.boundary, Date.now());
  }

  private fromPreviousCall(): boolean {
    this.boundary = boundaryExpired(this.boundary, Date.now(), VOICE_PREVIOUS_CALL_GRACE_MS);
    return this.boundary.pendingStops > 0;
  }

  private async resume(session: number): Promise<void> {
    this.resuming = true;
    this.serverSession = false;
    this.phase = 'connecting';
    this.gate = INITIAL_TURN_GATE;
    this.resetMicPending();
    this.playout.flush();
    this.liveCameraId = null;
    this.notify();
    const deadline = Date.now() + VOICE_RESUME_WINDOW_MS;
    while (this.isCurrent(session) && Date.now() < deadline) {
      if (await synchronizeService.ensureConnected()) break;
      await wait(VOICE_RESUME_RETRY_MS);
    }
    this.resuming = false;
    if (!this.isCurrent(session)) return;
    if (!synchronizeService.isSocketConnected) {
      this.fail('SOCKET_LOST|Connection to Argus lost', { serverGone: true });
      return;
    }
    synchronizeService.send(VOICE_START_TYPE, { mode: VOICE_MODE_DUPLEX, resume: true });
    this.serverSession = true;
    if (this.muted) synchronizeService.send(VOICE_MUTE_TYPE, { muted: true });
    this.phase = 'listening';
    this.notify();
    for (const listener of this.resumeListeners) listener();
  }

  private handleMicData(pcm: ArrayBuffer): void {
    if (!this.active || this.resuming) return;
    const now = Date.now();
    if (now - this.lastSocketCheckAt > SOCKET_CHECK_INTERVAL_MS) {
      this.lastSocketCheckAt = now;
      if (!synchronizeService.isSocketConnected) {
        void this.resume(this.session);
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
    if (this.fromPreviousCall() || !gateAcceptsAudio(this.gate)) return;
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
      if (!frame || this.fromPreviousCall()) return;
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
      if (this.fromPreviousCall()) return;
      const p = payload as IVoiceReactionPayload;
      useAvatarStore.getState().react(p.reaction, p.intensity ?? 0);
    });
    synchronizeService.onType(VOICE_TURN_TYPE, (payload) => {
      const id = parseTurnId(payload);
      if (id === null || this.fromPreviousCall()) return;
      this.gate = gateOnTurn(id);
    });
    synchronizeService.onType(VOICE_INTERRUPTED_TYPE, (payload) => {
      if (this.fromPreviousCall()) return;
      const outcome = gateOnInterrupted(this.gate, parseTurnId(payload));
      this.gate = outcome.gate;
      if (!outcome.flush) return;
      this.playout.flush();
      if (this.active && (this.phase === 'speaking' || this.phase === 'thinking')) this.phase = 'listening';
      this.notify();
    });
    synchronizeService.onType(VOICE_ASSISTANT_TYPE, (payload) => {
      const text = parseAssistantText(payload);
      if (text === null || this.fromPreviousCall() || !gateAcceptsAudio(this.gate)) return;
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
      if (!action || !this.active || this.fromPreviousCall() || hasAction(this.actions, action.id)) return;
      this.actions = recordAction({ records: this.actions, action, kept: CALL_ACTIONS_KEPT });
      this.notify();
      for (const listener of this.actionListeners) listener(action);
    });
    synchronizeService.onType(VOICE_DONE_TYPE, () => {
      const { boundary, previousCall } = boundaryAfterDone(this.boundary);
      this.boundary = boundary;
      if (previousCall) return;
      this.phase = 'done';
      this.active = false;
      this.serverSession = false;
      this.liveCameraId = null;
      this.stopCapture();
      this.playout.drainThenStop();
      this.notify();
    });
    synchronizeService.onType(VOICE_ERROR_TYPE, (payload) => {
      this.fail(parseVoiceError(payload), { serverGone: true });
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

  private fail(message: string, { serverGone }: FailOptions = { serverGone: false }): void {
    devLog('fail:', message);
    this.error = message;
    this.phase = 'error';
    this.active = false;
    this.liveCameraId = null;
    this.endServerSession(serverGone);
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
      actions: this.actions,
      liveCameraId: this.liveCameraId,
      error: this.error,
    };
  }

  private notify(): void {
    this.snapshotValue = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}

export const voiceService = new VoiceService();
