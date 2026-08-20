export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'done' | 'error';

export type VoiceTurnRole = 'user' | 'assistant';

/** Future: Argus will also talk through the cameras (detected person, not the user). */
export type VoiceSessionSource = 'app' | 'camera';

export type VoiceEventType =
  | 'voice:start'
  | 'voice:stop'
  | 'voice:skip'
  | 'voice:answer'
  | 'voice:stt'
  | 'voice:assistant'
  | 'voice:event'
  | 'voice:done'
  | 'voice:error';