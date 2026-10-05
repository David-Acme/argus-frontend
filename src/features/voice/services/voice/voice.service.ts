import { requestRecordingPermissionsAsync } from 'expo-audio';
import { AppState } from 'react-native';
import { incomingCallCancelSchema, incomingCallSchema } from '@/core/contracts/rtc.contract';
import { withTiming } from 'react-native-reanimated';
import { synchronizeService } from '@/core/services/sync';
import type { IRealtimeCall, IVoiceMic, IVoiceReactionPayload } from '@/core/interfaces';
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
import { IS_TAURI, SYNC_OPERATION, VOICE_ERROR_TYPE } from '@/shared/constants';
import {
  VOICE_ENVELOPE_ATTACK_MS,
  VOICE_ENVELOPE_RELEASE_MS,
} from '@/features/voice/constants/reaction';
import { voiceLevel } from '@/features/voice/model/voice-level';
import {
  incomingCallLive,
  readRevocation,
  readAgentState,
  readRtcData,
  rtcPhase,
  rtcTopicOf,
} from '@/features/voice/model/rtc-protocol';
import { createRealtimeCall, rtcCallSupported } from '@/features/voice/services/rtc';
import { requestCallToken } from '@/features/voice/services/rtc/rtc-token';
import { endRevokedSession } from '@/features/voice/services/voice/voice-session-end';
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
  IncomingCall,
  SessionRevokeCause,
  RtcAgentState,
  RtcCallOutcome,
  RtcCallState,
  RtcEndReason,
  RtcEvent,
  RtcTokenGrant,
  RtcTokenRequest,
  VoiceAction,
  VoiceActionOutcome,
  VoiceStartOptions,
  VoiceTransport,
  VoiceActionRecord,
  VoiceContext,
  VoicePhase,
  VoiceSnapshot,
  VoiceTranscriptLine,
} from '@/core/types';
import { log } from '@/core/services/log';
import { createVoiceMic } from './voice-platform';
import {
  parseAssistantText,
  parseSttFrame,
  parseTurnId,
  parseVoiceAction,
  parseVoiceError,
} from '@/features/voice/services/voice/voice-frames';
import { VoicePlayout } from '@/features/voice/services/voice/voice-playout';
import {
  appendAssistantText,
  appendUserLine,
  lastAssistantText,
} from '@/features/voice/services/voice/voice-transcript';
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
type FrameHandler = (payload: unknown) => void;
type IncomingListener = (call: IncomingCall) => void;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const MIC_FRAME_SAMPLES = (VOICE_SAMPLE_RATE * VOICE_MIC_FRAME_MS) / 1000;
const SOCKET_CHECK_INTERVAL_MS = 1000;
const PENDING_SENDS_MAX = 20;
const REVOKED_FAREWELL_MAX_MS = 4000;
const OUTCOME_ERRORS: Readonly<Record<RtcCallOutcome, string>> = {
  'not-found': 'CALL_NOT_FOUND|The call is no longer there',
  taken: 'CALL_TAKEN|The call was answered on another device',
  expired: 'CALL_EXPIRED|The call was missed',
};
const END_ERRORS: Partial<Record<RtcEndReason, string>> = {
  revoked: 'SESSION_REVOKED|This session was closed',
  replaced: 'CALL_TAKEN|The call continued on another device',
};

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
  private incomingListeners = new Set<IncomingListener>();
  private resuming = false;
  private transport: VoiceTransport = 'none';
  private rtc: IRealtimeCall | null = null;
  private rtcState: RtcCallState = 'connecting';
  private agentState: RtcAgentState | null = null;
  private callId: string | null = null;
  private callReason: string | null = null;
  private pendingSends: { type: string; payload: unknown }[] = [];
  private claiming = false;
  private revoked: { cause: SessionRevokeCause | null } | null = null;
  private revokedTimer: ReturnType<typeof setTimeout> | null = null;
  private waitingCall: IncomingCall | null = null;
  private waitingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handlers: Readonly<Record<string, FrameHandler>> = this.buildHandlers();
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

  async start(options: VoiceStartOptions = {}): Promise<void> {
    if (this.active) return;
    this.finishRevoked();
    this.session += 1;
    const session = this.session;
    this.active = true;
    this.phase = 'connecting';
    this.transport = 'none';
    this.pendingSends = [];
    this.callId = options.callId ?? null;
    this.callReason = options.reason ?? null;
    this.agentState = null;
    this.rtcState = 'connecting';
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

    const realtime = rtcCallSupported();
    if (!(realtime && IS_TAURI) && !(await this.microphoneGranted(session))) return;
    if (realtime) {
      const handled = await this.startRealtime(session, { callId: options.callId });
      if (handled || !this.isCurrent(session)) return;
      if (options.callId) {
        this.fail('RTC_UNAVAILABLE|Argus cannot take this call here');
        return;
      }
    }
    await this.startLegacy(session);
  }

  private async microphoneGranted(session: number): Promise<boolean> {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!this.isCurrent(session)) return false;
      if (!granted) {
        this.fail('MIC_PERMISSION_DENIED|Microphone permission denied');
        return false;
      }
      return true;
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : String(reason);
      if (this.isCurrent(session))
        this.fail(raw.startsWith('NOT_SUPPORTED') ? raw : `MIC_UNAVAILABLE|${raw}`);
      return false;
    }
  }

  private async startRealtime(session: number, request: RtcTokenRequest): Promise<boolean> {
    this.claiming = true;
    const answer = await requestCallToken(request).finally(() => {
      this.claiming = false;
    });
    if (!this.isCurrent(session)) return true;
    if (answer.kind === 'fallback') return false;
    if (answer.kind === 'outcome') {
      this.fail(OUTCOME_ERRORS[answer.outcome], { serverGone: true });
      return true;
    }
    if (answer.kind === 'refused') {
      this.fail(`${answer.code}|${answer.message}`, { serverGone: true });
      return true;
    }
    await this.joinRealtime(session, answer.grant);
    return true;
  }

  private async joinRealtime(session: number, grant: RtcTokenGrant): Promise<void> {
    this.transport = 'rtc';
    this.callId = grant.callId;
    this.serverSession = true;
    const call = this.resuming && this.rtc ? this.rtc : createRealtimeCall();
    this.rtc = call;
    this.notify();
    try {
      await call.join(
        { url: grant.url, token: grant.token, agentIdentity: grant.agentIdentity },
        (event) => this.handleRtcEvent(session, event)
      );
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : String(reason);
      devLog('rtc join failed:', raw);
      if (this.isCurrent(session))
        this.fail(raw.includes('|') ? raw : `RTC_UNAVAILABLE|${raw}`, { serverGone: true });
      return;
    }
    if (!this.isCurrent(session)) {
      void call.leave();
      return;
    }
    if (this.muted) {
      void call.setMicrophone(false);
      this.sendVoice(VOICE_MUTE_TYPE, { muted: true });
    }
    this.flushPendingSends();
    if (this.resuming) {
      this.resuming = false;
      for (const listener of this.resumeListeners) listener();
    }
  }

  private handleRtcEvent(session: number, event: RtcEvent): void {
    if (this.session !== session || this.transport !== 'rtc') return;
    if (event.kind === 'data') {
      const frame = readRtcData(event.topic, event.payload);
      if (!frame) return;
      const revocation = readRevocation(frame.type, frame.payload);
      if (revocation) this.beginRevoked(revocation.cause);
      else this.handlers[frame.type]?.(frame.payload);
      return;
    }
    if (event.kind === 'level') {
      const duration =
        event.remote >= voiceLevel.value ? VOICE_ENVELOPE_ATTACK_MS : VOICE_ENVELOPE_RELEASE_MS;
      voiceLevel.value = withTiming(event.remote, { duration });
      return;
    }
    if (event.kind === 'agentAudio') {
      if (!event.active) voiceLevel.value = withTiming(0, { duration: VOICE_ENVELOPE_RELEASE_MS });
      return;
    }
    if (event.kind === 'agent') {
      this.agentState = readAgentState(event.state);
      this.applyRtcPhase();
      return;
    }
    this.rtcState = event.state;
    if (event.state !== 'disconnected') {
      this.applyRtcPhase();
      return;
    }
    if (this.revoked) {
      this.finishRevoked();
      return;
    }
    if (!this.active || event.reason === 'local') return;
    const ended = END_ERRORS[event.reason ?? 'lost'];
    if (ended) {
      this.fail(ended, { serverGone: true });
      return;
    }
    if (event.reason === 'ended') {
      this.finishCall();
      return;
    }
    void this.resumeRealtime(session);
  }

  private beginRevoked(cause: SessionRevokeCause | null): void {
    if (this.revoked) return;
    this.revoked = { cause };
    this.resuming = false;
    this.revokedTimer = setTimeout(() => this.finishRevoked(), REVOKED_FAREWELL_MAX_MS);
  }

  private finishRevoked(): void {
    const revoked = this.revoked;
    if (!revoked) return;
    this.revoked = null;
    if (this.revokedTimer !== null) clearTimeout(this.revokedTimer);
    this.revokedTimer = null;
    this.error =
      revoked.cause === 'accountDisabled'
        ? 'ACCOUNT_DISABLED|This account was disabled'
        : 'SESSION_REVOKED|This session was closed';
    this.phase = 'error';
    this.active = false;
    this.liveCameraId = null;
    this.leaveRealtime(true);
    this.notify();
    endRevokedSession(revoked.cause);
  }

  private applyRtcPhase(): void {
    if (!this.active || this.phase === 'error' || this.phase === 'done') return;
    const next = rtcPhase(this.rtcState, this.agentState);
    if (next === this.phase) return;
    this.phase = next;
    this.notify();
  }

  private async resumeRealtime(session: number): Promise<void> {
    if (this.resuming || !this.callId) return;
    this.resuming = true;
    this.agentState = null;
    this.phase = 'reconnecting';
    this.notify();
    const deadline = Date.now() + VOICE_RESUME_WINDOW_MS;
    while (this.isCurrent(session) && Date.now() < deadline) {
      const answer = await requestCallToken({ callId: this.callId, resume: true });
      if (!this.isCurrent(session)) return;
      if (answer.kind === 'granted') {
        await this.joinRealtime(session, answer.grant);
        return;
      }
      if (answer.kind === 'outcome') break;
      await wait(VOICE_RESUME_RETRY_MS);
    }
    this.resuming = false;
    if (this.isCurrent(session))
      this.fail('SOCKET_LOST|Connection to Argus lost', { serverGone: true });
  }

  private async startLegacy(session: number): Promise<void> {
    const connected = await synchronizeService.ensureConnected();
    if (!this.isCurrent(session)) return;
    if (!connected) {
      this.fail('SOCKET_UNAVAILABLE|Unable to connect to Argus');
      return;
    }
    synchronizeService.send(VOICE_START_TYPE, { mode: VOICE_MODE_DUPLEX });
    this.serverSession = true;
    this.transport = 'sync';
    this.flushPendingSends();

    try {
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
    this.clearWaiting();
    if (this.revoked) {
      this.active = false;
      this.notify();
      return;
    }
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
    this.sendVoice(VOICE_SKIP_TYPE, {});
    if (this.transport === 'rtc') return;
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
    if (this.serverSession) this.sendVoice(VOICE_MUTE_TYPE, { muted });
    if (this.transport === 'rtc') void this.rtc?.setMicrophone(!muted).catch(() => undefined);
    this.notify();
  }

  completeAction(id: string, outcome: VoiceActionOutcome): void {
    const settled = settleAction({ records: this.actions, id, outcome });
    if (settled === this.actions) return;
    this.actions = settled;
    if (this.serverSession) {
      const numeric = Number(id);
      this.sendVoice(VOICE_ACTION_RESULT_TYPE, {
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

  onIncoming(listener: IncomingListener): () => void {
    this.incomingListeners.add(listener);
    return () => {
      this.incomingListeners.delete(listener);
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
    this.sendVoice(VOICE_CONTEXT_TYPE, context);
  }

  setThinking(): void {
    this.phase = 'thinking';
    this.notify();
  }

  private isCurrent(session: number): boolean {
    return this.active && this.session === session;
  }

  get snapshotTransport(): VoiceTransport {
    return this.transport;
  }

  private sendVoice(type: string, payload: unknown): void {
    if (this.transport === 'none') {
      if (this.active && this.pendingSends.length < PENDING_SENDS_MAX)
        this.pendingSends.push({ type, payload });
      return;
    }
    if (this.transport !== 'rtc') {
      synchronizeService.send(type, payload);
      return;
    }
    const topic = rtcTopicOf(type);
    const call = this.rtc;
    if (!topic || !call) return;
    void call
      .send(topic, JSON.stringify(payload ?? {}))
      .catch((reason: unknown) => devLog('rtc send failed:', reason));
  }

  private flushPendingSends(): void {
    const pending = this.pendingSends;
    this.pendingSends = [];
    for (const { type, payload } of pending) this.sendVoice(type, payload);
  }

  private endServerSession(serverGone = false): void {
    if (this.transport === 'rtc') {
      this.leaveRealtime(serverGone);
      return;
    }
    if (!this.serverSession) return;
    this.serverSession = false;
    if (serverGone) return;
    synchronizeService.send(VOICE_STOP_TYPE);
    this.boundary = boundaryAfterStop(this.boundary, Date.now());
  }

  private leaveRealtime(serverGone: boolean): void {
    const call = this.rtc;
    const hangUp = this.serverSession && !serverGone;
    this.serverSession = false;
    this.resuming = false;
    this.agentState = null;
    this.transport = 'none';
    voiceLevel.value = withTiming(0, { duration: VOICE_ENVELOPE_RELEASE_MS });
    if (!call) return;
    const hangup = hangUp
      ? call.send('argus.hangup', '{}').catch(() => undefined)
      : Promise.resolve();
    void hangup
      .then(() => call.leave())
      .catch((reason: unknown) => devLog('rtc leave failed:', reason));
  }

  private finishCall(): void {
    this.phase = 'done';
    this.active = false;
    this.liveCameraId = null;
    this.endServerSession(true);
    this.stopCapture();
    this.playout.drainThenStop();
    this.notify();
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

  private buildHandlers(): Record<string, FrameHandler> {
    return {
      [VOICE_STT_TYPE]: (payload) => {
        const frame = parseSttFrame(payload);
        if (!frame || this.fromPreviousCall()) return;
        this.sttText = frame.text;
        if (frame.final && frame.text.trim()) {
          this.userLines += 1;
          this.transcript = appendUserLine(
            this.transcript,
            { id: `user-${this.userLines}`, text: frame.text },
            VOICE_TRANSCRIPT_MAX_LINES
          );
          this.gate = gateOnUserFinal(this.gate);
          this.localTurn += 1;
          if (this.active && this.transport !== 'rtc' && this.phase === 'listening')
            this.phase = 'thinking';
        }
        this.notify();
      },
      [VOICE_EVENT_TYPE]: (payload) => {
        if (this.fromPreviousCall()) return;
        const p = payload as IVoiceReactionPayload;
        useAvatarStore.getState().react(p.reaction, p.intensity ?? 0);
      },
      [VOICE_TURN_TYPE]: (payload) => {
        const id = parseTurnId(payload);
        if (id === null || this.fromPreviousCall()) return;
        this.gate = gateOnTurn(id);
      },
      [VOICE_INTERRUPTED_TYPE]: (payload) => {
        if (this.fromPreviousCall()) return;
        const outcome = gateOnInterrupted(this.gate, parseTurnId(payload));
        this.gate = outcome.gate;
        if (!outcome.flush) return;
        if (this.transport === 'rtc') return;
        this.playout.flush();
        if (this.active && (this.phase === 'speaking' || this.phase === 'thinking'))
          this.phase = 'listening';
        this.notify();
      },
      [VOICE_ASSISTANT_TYPE]: (payload) => {
        const text = parseAssistantText(payload);
        if (text === null || this.fromPreviousCall() || !gateAcceptsAudio(this.gate)) return;
        this.transcript = appendAssistantText(
          this.transcript,
          { turnKey: assistantTurnKey(this.gate, this.localTurn), text },
          VOICE_TRANSCRIPT_MAX_LINES
        );
        if (this.transport !== 'rtc') {
          if (this.active && this.phase === 'thinking') this.phase = 'speaking';
          if (!this.playout.isPlaying) this.playout.armIdle();
        }
        this.notify();
      },
      [VOICE_ACTION_TYPE]: (payload) => {
        const action = parseVoiceAction(payload);
        if (
          !action ||
          !this.active ||
          this.fromPreviousCall() ||
          hasAction(this.actions, action.id)
        )
          return;
        this.actions = recordAction({ records: this.actions, action, kept: CALL_ACTIONS_KEPT });
        this.notify();
        for (const listener of this.actionListeners) listener(action);
      },
      [VOICE_DONE_TYPE]: () => {
        if (this.transport === 'rtc') {
          this.finishCall();
          return;
        }
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
      },
      [VOICE_ERROR_TYPE]: (payload) => {
        this.fail(parseVoiceError(payload), { serverGone: true });
      },
    };
  }

  private handleIncoming(info: unknown): void {
    const parsed = incomingCallSchema.safeParse(info);
    if (!parsed.success) return;
    const call = parsed.data;
    if (!incomingCallLive(call.expiresAt, Date.now()) || AppState.currentState !== 'active') return;
    if (this.active) {
      if (call.callId !== this.callId) this.holdWaiting(call);
      return;
    }
    void this.start({ callId: call.callId, reason: call.reason });
    for (const listener of this.incomingListeners) listener(call);
  }

  private holdWaiting(call: IncomingCall): void {
    this.clearWaiting();
    this.waitingCall = call;
    this.waitingTimer = setTimeout(
      () => {
        this.clearWaiting();
        this.notify();
      },
      Math.max(0, call.expiresAt * 1000 - Date.now())
    );
    this.notify();
  }

  private clearWaiting(): void {
    if (this.waitingTimer !== null) clearTimeout(this.waitingTimer);
    this.waitingTimer = null;
    this.waitingCall = null;
  }

  answerWaiting(): void {
    const call = this.waitingCall;
    if (!call) return;
    this.clearWaiting();
    this.stop();
    void this.start({ callId: call.callId, reason: call.reason });
  }

  dismissWaiting(): void {
    if (!this.waitingCall) return;
    this.clearWaiting();
    this.notify();
  }

  private handleIncomingCancel(info: unknown): void {
    const parsed = incomingCallCancelSchema.safeParse(info);
    if (parsed.success && this.waitingCall?.callId === parsed.data.callId) {
      this.clearWaiting();
      this.notify();
      return;
    }
    if (
      !parsed.success ||
      !this.active ||
      this.claiming ||
      this.callId !== parsed.data.callId ||
      this.transport !== 'none'
    )
      return;
    this.fail(OUTCOME_ERRORS[parsed.data.reason === 'expired' ? 'expired' : 'taken'], {
      serverGone: true,
    });
  }

  private bindSocket(): void {
    synchronizeService.on(SYNC_OPERATION.CallIncoming, (message) =>
      this.handleIncoming(message.info)
    );
    synchronizeService.on(SYNC_OPERATION.CallCancel, (message) =>
      this.handleIncomingCancel(message.info)
    );
    for (const [type, handler] of Object.entries(this.handlers)) {
      synchronizeService.onType(type, (payload) => {
        if (this.transport !== 'rtc') handler(payload);
      });
    }
    synchronizeService.onBinary((data) => {
      if (this.transport !== 'rtc') this.handleTts(data);
    });
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
      transport: this.transport,
      callReason: this.callReason,
      waitingCall: this.waitingCall,
    };
  }

  private notify(): void {
    this.snapshotValue = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}

export const voiceService = new VoiceService();
