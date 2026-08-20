/** Voice channel over the unified socket: JSON `voice:*` + PCM binary. */
export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_CHUNK_MS = 80;
export const VOICE_MAX_TURN_MS = 30000;

/** Mic-level smoothing: fast attack, slow release (dBFS envelope). */
export const VOICE_METER_ATTACK_MS = 50;

export const VOICE_METER_RELEASE_MS = 260;
// Safety net for playback: if expo-audio never reports didJustFinish
// (interrupted player, app switch), the mic is resumed anyway so the
// session never goes permanently deaf after the first reply.
export const VOICE_TTS_WATCHDOG_MS = 30000;

export const VOICE_START_TYPE = 'voice:start';
export const VOICE_STOP_TYPE = 'voice:stop';
export const VOICE_SKIP_TYPE = 'voice:skip';
export const VOICE_ANSWER_TYPE = 'voice:answer';
export const VOICE_STT_TYPE = 'voice:stt';
export const VOICE_ASSISTANT_TYPE = 'voice:assistant';
export const VOICE_EVENT_TYPE = 'voice:event';
export const VOICE_DONE_TYPE = 'voice:done';
export const VOICE_ERROR_TYPE = 'voice:error';

export const VOICE_TURN_MAX_SILENCE_MS = 1200;