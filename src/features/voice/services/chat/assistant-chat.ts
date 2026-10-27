import type {
  AssistantChatEntry,
  AssistantChatSnapshot,
  VoiceAction,
  VoiceActionOutcome,
  VoiceContext,
} from '@/core/types';
import {
  ASSISTANT_CHAT_ENTRIES_KEPT,
  ASSISTANT_CHAT_MAX_CHARS,
  ASSISTANT_CHAT_REPLY_TIMEOUT_MS,
  VOICE_ACTION_RESULT_TYPE,
  VOICE_ACTION_TYPE,
  VOICE_ASSISTANT_TYPE,
  VOICE_CONFIRM_TYPE,
  VOICE_CONTEXT_TYPE,
  VOICE_DONE_TYPE,
  VOICE_MODE_CHAT,
  VOICE_PREVIOUS_CALL_GRACE_MS,
  VOICE_START_TYPE,
  VOICE_STOP_TYPE,
  VOICE_STT_CORRECTION_TYPE,
  VOICE_TEXT_DONE_TYPE,
  VOICE_TEXT_ERROR_TYPE,
  VOICE_TEXT_TYPE,
} from '@/features/voice/constants/voice';
import { VOICE_ERROR_TYPE } from '@/shared/constants';
import type { VoiceConfirm } from '@/features/voice/model/argus-result';
import type { AssistantSocket } from '@/features/voice/services/voice/assistant-socket';
import { parseVoiceAction, parseVoiceError } from '@/features/voice/services/voice/voice-frames';

export type AssistantChatTransport = {
  ensureConnected: () => Promise<boolean>;
  send: (type: string, payload: unknown) => void;
  onType: (type: string, listener: (payload: unknown) => void) => () => void;
  onConnect: (listener: () => void) => () => void;
  onDisconnect: (listener: () => void) => () => void;
};

export type AssistantChatDeps = {
  transport: AssistantChatTransport;
  socket: AssistantSocket;
  newClientId: () => string;
  leg: string;
  now: () => number;
  callActive: () => boolean;
  schedule: (run: () => void, ms: number) => () => void;
};

export type AssistantChatSend = 'sent' | 'invalid' | 'busy';

type SessionState = 'idle' | 'starting' | 'open';
type Listener = () => void;
type ActionListener = (action: VoiceAction) => void;
type FrameRecord = Record<string, unknown>;

export const CHAT_ERRORS = {
  socketUnavailable: 'SOCKET_UNAVAILABLE|Unable to connect to Argus',
  socketLost: 'SOCKET_LOST|Connection to Argus lost',
  callActive: 'CALL_ACTIVE|A call with Argus is live',
  interrupted: 'CHAT_INTERRUPTED|A call took the conversation',
  timeout: 'CHAT_TIMEOUT|Argus did not answer in time',
  unanswered: 'CHAT_UNANSWERED|Argus answered nothing',
  ended: 'CHAT_ENDED|The chat session ended',
} as const;

const asRecord = (payload: unknown): FrameRecord | null =>
  typeof payload === 'object' && payload !== null ? (payload as FrameRecord) : null;

const idOf = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
};

const clientIdOf = (payload: unknown): string | null => {
  const value = asRecord(payload)?.clientId;
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const turnIdOf = (payload: unknown): string | null => idOf(asRecord(payload)?.turnId);

export function chatMessageOf(draft: string): string | null {
  const text = draft.trim();
  if (text.length === 0 || [...text].length > ASSISTANT_CHAT_MAX_CHARS) return null;
  return text;
}

export class AssistantChat {
  private entries: readonly AssistantChatEntry[] = [];
  private session: SessionState = 'idle';
  private starting: Promise<boolean> | null = null;
  private wanted = false;
  private resumeOnConnect = false;
  private openedAt = 0;
  private draftValue = '';
  private userId: string | null = null;
  private seenActions = new Set<string>();
  private timers = new Map<string, () => void>();
  private listeners = new Set<Listener>();
  private actionListeners = new Set<ActionListener>();
  private snapshotValue: AssistantChatSnapshot = { entries: [], open: false };

  constructor(private readonly deps: AssistantChatDeps) {
    const { transport, socket } = deps;
    transport.onType(VOICE_ASSISTANT_TYPE, (payload) =>
      this.whenOwned(() => this.handleAssistant(payload))
    );
    transport.onType(VOICE_TEXT_DONE_TYPE, (payload) =>
      this.whenOwned(() => this.handleDone(payload))
    );
    transport.onType(VOICE_ACTION_TYPE, (payload) =>
      this.whenOwned(() => this.handleAction(payload))
    );
    transport.onType(VOICE_TEXT_ERROR_TYPE, (payload) =>
      this.whenOwned(() => this.handleTextError(payload))
    );
    transport.onType(VOICE_ERROR_TYPE, (payload) =>
      this.whenOwned(() => this.handleError(payload))
    );
    transport.onType(VOICE_DONE_TYPE, () => this.whenOwned(() => this.handleSessionDone()));
    transport.onType(VOICE_STT_CORRECTION_TYPE, (payload) =>
      this.whenOwned(() => this.handleCorrection(payload))
    );
    transport.onDisconnect(() => this.handleDisconnect());
    transport.onConnect(() => this.handleConnect());
    socket.onClaim((owner) => {
      if (owner !== 'chat') this.handleTakenOver();
    });
  }

  get snapshot(): AssistantChatSnapshot {
    return this.snapshotValue;
  }

  get isOpen(): boolean {
    return this.session === 'open';
  }

  get draft(): string {
    return this.draftValue;
  }

  get busy(): boolean {
    return this.hasPending();
  }

  setDraft(draft: string): void {
    this.draftValue = draft;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => {
      this.actionListeners.delete(listener);
    };
  }

  bindUser(userId: string | null): void {
    if (this.userId === userId) return;
    this.userId = userId;
    this.stopSession();
    this.wanted = false;
    this.clearTimers();
    this.entries = [];
    this.draftValue = '';
    this.seenActions = new Set();
    this.notify();
  }

  open(): void {
    this.wanted = true;
  }

  close(): void {
    this.wanted = false;
    if (!this.hasPending()) this.stopSession();
  }

  send(draft: string): AssistantChatSend {
    const text = chatMessageOf(draft);
    if (text === null) return 'invalid';
    if (this.hasPending()) return 'busy';
    this.enqueue(text);
    return 'sent';
  }

  retry(clientId: string): void {
    const entry = this.entries.find((candidate) => candidate.clientId === clientId);
    if (!entry || entry.status !== 'failed' || this.hasPending()) return;
    this.entries = this.entries.filter((candidate) => candidate.clientId !== clientId);
    this.enqueue(entry.text);
  }

  dismiss(clientId: string): void {
    const next = this.entries.filter(
      (entry) => entry.clientId !== clientId || entry.status !== 'failed'
    );
    if (next.length === this.entries.length) return;
    this.entries = next;
    this.notify();
  }

  confirm(answer: VoiceConfirm): boolean {
    if (this.deps.callActive()) return false;
    const userId = this.userId;
    void this.ensureSession(false).then((open) => {
      if (open && this.userId === userId) this.deps.transport.send(VOICE_CONFIRM_TYPE, answer);
    });
    return true;
  }

  sendContext(context: VoiceContext): void {
    if (this.session !== 'open' || this.deps.socket.owner !== 'chat') return;
    this.deps.transport.send(VOICE_CONTEXT_TYPE, context);
  }

  completeAction(id: string, outcome: VoiceActionOutcome): void {
    if (this.session !== 'open') return;
    const numeric = Number(id);
    this.deps.transport.send(VOICE_ACTION_RESULT_TYPE, {
      id: Number.isSafeInteger(numeric) ? numeric : id,
      ok: outcome.ok,
      detail: outcome.detail ?? '',
    });
  }

  private enqueue(text: string): void {
    const entry: AssistantChatEntry = {
      clientId: this.deps.newClientId(),
      text,
      sentAt: this.deps.now(),
      status: 'sending',
      reply: '',
      turnId: null,
      error: null,
    };
    this.entries = [...this.entries, entry].slice(-ASSISTANT_CHAT_ENTRIES_KEPT);
    if (this.deps.callActive()) {
      this.fail(entry.clientId, CHAT_ERRORS.callActive);
      return;
    }
    this.notify();
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (!(await this.ensureSession(false))) return;
    for (const entry of this.entries) {
      if (entry.status !== 'sending') continue;
      this.deps.transport.send(VOICE_TEXT_TYPE, { text: entry.text, clientId: entry.clientId });
      this.update(entry.clientId, { status: 'waiting' });
      this.arm(entry.clientId);
    }
    this.notify();
  }

  private ensureSession(resume: boolean): Promise<boolean> {
    if (this.session === 'open') return Promise.resolve(true);
    if (this.starting) return this.starting;
    this.session = 'starting';
    const userId = this.userId;
    const attempt = this.deps.transport
      .ensureConnected()
      .catch(() => false)
      .then((connected) => {
        this.starting = null;
        if (this.userId !== userId || this.session !== 'starting') return false;
        if (!connected) {
          this.session = 'idle';
          this.failWhere((entry) => entry.status === 'sending', CHAT_ERRORS.socketUnavailable);
          return false;
        }
        this.deps.socket.claim('chat');
        this.deps.transport.send(VOICE_START_TYPE, {
          mode: VOICE_MODE_CHAT,
          leg: this.deps.leg,
          ...(resume ? { resume: true } : {}),
        });
        this.session = 'open';
        this.entries = this.entries.map((entry) =>
          entry.turnId === null ? entry : { ...entry, turnId: null }
        );
        this.openedAt = this.deps.now();
        this.resumeOnConnect = false;
        this.notify();
        return true;
      });
    this.starting = attempt;
    return attempt;
  }

  private stopSession(): void {
    const wasOpen = this.session === 'open';
    this.session = 'idle';
    this.starting = null;
    this.resumeOnConnect = false;
    if (wasOpen && this.deps.socket.owner === 'chat') this.deps.transport.send(VOICE_STOP_TYPE, {});
    if (wasOpen) this.notify();
  }

  private whenOwned(run: () => void): void {
    if (this.session !== 'open' || this.deps.socket.owner !== 'chat') return;
    run();
  }

  private targetOf(payload: unknown): AssistantChatEntry | undefined {
    const clientId = clientIdOf(payload);
    if (clientId !== null) return this.entries.find((entry) => entry.clientId === clientId);
    const turnId = turnIdOf(payload);
    if (turnId !== null) {
      const byTurn = this.entries.find((entry) => entry.turnId === turnId);
      if (byTurn) return byTurn;
    }
    return this.entries.find(
      (entry) => entry.status === 'waiting' && (turnId === null || entry.turnId === null)
    );
  }

  private handleAssistant(payload: unknown): void {
    const text = asRecord(payload)?.text;
    if (typeof text !== 'string' || text.length === 0) return;
    const entry = this.targetOf(payload);
    if (!entry || entry.status !== 'waiting') return;
    this.update(entry.clientId, {
      reply: entry.reply + text,
      turnId: entry.turnId ?? turnIdOf(payload),
    });
    this.arm(entry.clientId);
    this.notify();
  }

  private handleDone(payload: unknown): void {
    const entry = this.targetOf(payload);
    if (!entry || entry.status !== 'waiting') return;
    this.disarm(entry.clientId);
    if (entry.reply.trim().length === 0) {
      this.update(entry.clientId, { status: 'failed', error: CHAT_ERRORS.unanswered });
    } else {
      this.update(entry.clientId, { status: 'done', turnId: entry.turnId ?? turnIdOf(payload) });
    }
    this.notify();
    if (!this.wanted && !this.hasPending()) this.stopSession();
  }

  private handleAction(payload: unknown): void {
    const action = parseVoiceAction(payload);
    if (!action || this.seenActions.has(action.id)) return;
    this.seenActions.add(action.id);
    for (const listener of this.actionListeners) listener(action);
  }

  private handleTextError(payload: unknown): void {
    const record = asRecord(payload);
    const clientId = clientIdOf(payload);
    const entry =
      clientId !== null
        ? this.entries.find((candidate) => candidate.clientId === clientId)
        : this.entries.find((candidate) => candidate.status === 'waiting');
    if (!entry || entry.status !== 'waiting') return;
    if (record?.status === 409) {
      this.session = 'idle';
      this.starting = null;
    }
    this.fail(entry.clientId, parseVoiceError(payload));
  }

  private handleError(payload: unknown): void {
    if (asRecord(payload)?.clientId !== undefined) return;
    this.session = 'idle';
    this.starting = null;
    this.failWhere(
      (entry) => entry.status === 'waiting' || entry.status === 'sending',
      parseVoiceError(payload)
    );
  }

  private handleSessionDone(): void {
    const pending = this.hasPending();
    if (!pending && this.deps.now() - this.openedAt < VOICE_PREVIOUS_CALL_GRACE_MS) return;
    this.session = 'idle';
    this.starting = null;
    this.failWhere(
      (entry) => entry.status === 'waiting' || entry.status === 'sending',
      CHAT_ERRORS.ended
    );
  }

  private handleCorrection(payload: unknown): void {
    const text = asRecord(payload)?.text;
    if (typeof text !== 'string') return;
    const entry = this.entries.find((candidate) => candidate.status === 'waiting');
    if (!entry) return;
    this.update(entry.clientId, { text });
    this.notify();
  }

  private handleDisconnect(): void {
    if (this.session === 'idle') return;
    this.resumeOnConnect = this.wanted;
    this.session = 'idle';
    this.starting = null;
    this.failWhere((entry) => entry.status === 'waiting', CHAT_ERRORS.socketLost);
  }

  private handleConnect(): void {
    const queued = this.entries.some((entry) => entry.status === 'sending');
    if (!this.resumeOnConnect && !queued) return;
    if (!this.wanted && !queued) return;
    void this.ensureSession(true).then((open) => {
      if (open && queued) void this.flush();
    });
  }

  private handleTakenOver(): void {
    if (this.session === 'idle' && !this.hasPending()) return;
    this.session = 'idle';
    this.starting = null;
    this.resumeOnConnect = false;
    this.failWhere(
      (entry) => entry.status === 'waiting' || entry.status === 'sending',
      CHAT_ERRORS.interrupted
    );
  }

  private hasPending(): boolean {
    return this.entries.some((entry) => entry.status === 'waiting' || entry.status === 'sending');
  }

  private arm(clientId: string): void {
    this.disarm(clientId);
    this.timers.set(
      clientId,
      this.deps.schedule(() => {
        this.timers.delete(clientId);
        const entry = this.entries.find((candidate) => candidate.clientId === clientId);
        if (entry?.status === 'waiting') this.fail(clientId, CHAT_ERRORS.timeout);
      }, ASSISTANT_CHAT_REPLY_TIMEOUT_MS)
    );
  }

  private disarm(clientId: string): void {
    this.timers.get(clientId)?.();
    this.timers.delete(clientId);
  }

  private clearTimers(): void {
    for (const cancel of this.timers.values()) cancel();
    this.timers.clear();
  }

  private fail(clientId: string, error: string): void {
    this.disarm(clientId);
    this.update(clientId, { status: 'failed', error });
    this.notify();
  }

  private failWhere(match: (entry: AssistantChatEntry) => boolean, error: string): void {
    const failing = this.entries.filter(match).map((entry) => entry.clientId);
    for (const clientId of failing) {
      this.disarm(clientId);
      this.update(clientId, { status: 'failed', error });
    }
    this.notify();
  }

  private update(clientId: string, patch: Partial<AssistantChatEntry>): void {
    this.entries = this.entries.map((entry) =>
      entry.clientId === clientId ? { ...entry, ...patch } : entry
    );
  }

  private notify(): void {
    this.snapshotValue = { entries: this.entries, open: this.session === 'open' };
    this.listeners.forEach((listener) => listener());
  }
}
