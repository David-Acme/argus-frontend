export const VOICE_SAMPLE_RATE = 16000;

export const VOICE_MIC_FRAME_MS = 100;
export const VOICE_PLAYOUT_STALL_MS = 1500;
export const VOICE_PLAYOUT_IDLE_GRACE_MS = 250;
export const VOICE_TRANSCRIPT_MAX_LINES = 200;
export const VOICE_MODE_DUPLEX = 'duplex';

export const VOICE_START_TYPE = 'voice:start';
export const VOICE_STOP_TYPE = 'voice:stop';
export const VOICE_SKIP_TYPE = 'voice:skip';
export const VOICE_ANSWER_TYPE = 'voice:answer';
export const VOICE_STT_TYPE = 'voice:stt';
export const VOICE_ASSISTANT_TYPE = 'voice:assistant';
export const VOICE_EVENT_TYPE = 'voice:event';
export const VOICE_TURN_TYPE = 'voice:turn';
export const VOICE_INTERRUPTED_TYPE = 'voice:interrupted';
export const VOICE_ACTION_TYPE = 'voice:action';
export const VOICE_CONTEXT_TYPE = 'voice:context';
export const VOICE_ACTION_NAMES = ['app.show_camera', 'app.open', 'app.set_guard_mode'] as const;
export const VOICE_DONE_TYPE = 'voice:done';
export const VOICE_ERROR_TYPE = 'voice:error';

export const CALL_TRANSCRIPT_VISIBLE = 4;
