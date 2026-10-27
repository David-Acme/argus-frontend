import type { IncomingCall, RtcCallUrgency } from './rtc.type';

export type VoicePhase =
  'idle' | 'connecting' | 'reconnecting' | 'listening' | 'thinking' | 'speaking' | 'done' | 'error';

export type VoiceTurnRole = 'user' | 'assistant';

export type VoiceSessionSource = 'app' | 'camera';

export type VoiceMode = 'duplex';

export type VoiceEventType =
  | 'voice:start'
  | 'voice:stop'
  | 'voice:skip'
  | 'voice:answer'
  | 'voice:stt'
  | 'voice:stt_correction'
  | 'voice:assistant'
  | 'voice:event'
  | 'voice:turn'
  | 'voice:interrupted'
  | 'voice:action'
  | 'voice:action_result'
  | 'voice:mute'
  | 'voice:context'
  | 'voice:done'
  | 'voice:error';

export type VoiceActionName = 'app.show_camera' | 'app.open' | 'app.set_guard_mode';

export type VoiceAction = {
  id: string;
  name: VoiceActionName;
  arguments: Record<string, unknown>;
};

export type VoiceActionStatus = 'pending' | 'done' | 'failed';

export type VoiceActionRecord = VoiceAction & {
  status: VoiceActionStatus;
  detail: string | null;
};

export type VoiceActionOutcome = {
  ok: boolean;
  detail: string | null;
};

export type VoiceContextKind = 'note' | 'cameraEvent' | 'situation';

export type VoiceContext = {
  kind: VoiceContextKind;
  text: string;
  camera?: string;
};

export type VoiceSttFrame = {
  text: string;
  final: boolean;
};

export type VoiceTranscriptLine = {
  id: string;
  role: VoiceTurnRole;
  text: string;
};

export type VoiceCameraView = 'live' | 'snapshot';

export type VoiceSnapshot = {
  phase: VoicePhase;
  isActive: boolean;
  muted: boolean;
  sttText: string;
  assistantText: string;
  transcript: readonly VoiceTranscriptLine[];
  actions: readonly VoiceActionRecord[];
  liveCameraId: string | null;
  liveCameraView: VoiceCameraView;
  error: string | null;
  transport: VoiceTransport;
  callReason: string | null;
  responseId: number | null;
  waitingCall: IncomingCall | null;
  closedCallId: string | null;
  closedReason: CallEndReason | null;
  connectedAt: number | null;
  callUrgency: RtcCallUrgency | null;
};

export type CallEndReason = 'answered-ended' | 'missed' | 'declined' | 'claimed-elsewhere';

export type VoiceTransport = 'none' | 'sync' | 'rtc';

export type VoicePurpose = 'onboarding' | 'call_back';

export type VoiceStartOptions = {
  callId?: string;
  purpose?: VoicePurpose;
  reminderId?: number;
  reason?: string | null;
  urgency?: RtcCallUrgency | null;
  responseId?: number | null;
  watchConversationId?: string;
  socket?: boolean;
};

export type AssistantChatEntryStatus = 'sending' | 'waiting' | 'done' | 'failed';

export type AssistantChatEntry = {
  clientId: string;
  text: string;
  sentAt: number;
  status: AssistantChatEntryStatus;
  reply: string;
  turnId: string | null;
  error: string | null;
  noteId?: string | null;
};

export type AssistantChatSnapshot = {
  entries: readonly AssistantChatEntry[];
  open: boolean;
};
