export type VoicePhase = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'done' | 'error';

export type VoiceTurnRole = 'user' | 'assistant';

export type VoiceSessionSource = 'app' | 'camera';

export type VoiceMode = 'duplex';

export type VoiceEventType =
  | 'voice:start'
  | 'voice:stop'
  | 'voice:skip'
  | 'voice:answer'
  | 'voice:stt'
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

export type VoiceSnapshot = {
  phase: VoicePhase;
  isActive: boolean;
  muted: boolean;
  sttText: string;
  assistantText: string;
  transcript: readonly VoiceTranscriptLine[];
  actions: readonly VoiceActionRecord[];
  liveCameraId: string | null;
  error: string | null;
};
