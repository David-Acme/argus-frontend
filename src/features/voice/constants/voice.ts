export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_WORKLET_URL = '/voice/voice-worklets.js';

export const VOICE_MIC_FRAME_MS = 100;
export const VOICE_PLAYOUT_STALL_MS = 1500;
export const VOICE_PLAYOUT_IDLE_GRACE_MS = 250;
export const VOICE_TRANSCRIPT_MAX_LINES = 200;
export const VOICE_MODE_DUPLEX = 'duplex';

export const VOICE_START_TYPE = 'voice:start';
export const VOICE_STOP_TYPE = 'voice:stop';
export const VOICE_SKIP_TYPE = 'voice:skip';
export const VOICE_STT_TYPE = 'voice:stt';
export const VOICE_ASSISTANT_TYPE = 'voice:assistant';
export const VOICE_EVENT_TYPE = 'voice:event';
export const VOICE_TURN_TYPE = 'voice:turn';
export const VOICE_INTERRUPTED_TYPE = 'voice:interrupted';
export const VOICE_ACTION_TYPE = 'voice:action';
export const VOICE_ACTION_RESULT_TYPE = 'voice:action_result';
export const VOICE_MUTE_TYPE = 'voice:mute';
export const VOICE_CONTEXT_TYPE = 'voice:context';
export const VOICE_ACTION_NAMES = ['app.show_camera', 'app.open', 'app.set_guard_mode'] as const;
export const VOICE_DONE_TYPE = 'voice:done';

export const CALL_TRANSCRIPT_VISIBLE = 4;
export const CALL_ACTIONS_VISIBLE = 3;
export const CALL_ACTIONS_KEPT = 12;
export const CALL_SITUATION_DEBOUNCE_MS = 800;
export const CALL_SITUATION_AGENDA_ITEMS = 4;
export const CALL_SITUATION_EVENTS = 3;
export const VOICE_PREVIOUS_CALL_GRACE_MS = 3000;
