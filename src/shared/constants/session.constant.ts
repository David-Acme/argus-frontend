/** Session/sync keys in storageService (not secrets; tokens go to secure-storage). */
export const SESSION_USER_KEY = 'app.session.user';
export const SYNC_CURSORS_PREFIX = 'app.sync.';
export const ONBOARDING_STAGE_KEY = 'app.onboarding.stage';
export const VOICE_ENABLED_KEY = 'app.voiceEnabled';

export const SYNC_WS_PATH = '/sync';
export const WS_RECONNECT_BASE_MS = 2000;
export const WS_RECONNECT_MAX_MS = 30000;
