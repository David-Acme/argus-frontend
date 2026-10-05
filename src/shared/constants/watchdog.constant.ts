export const HEARTBEAT_REQUEST_TYPE = 'heartbeat';

export const HEARTBEAT_DEFAULTS = {
  intervalSeconds: 60,
  graceSeconds: 2700,
  socketGraceSeconds: 180,
} as const;

export const HEARTBEAT_MIN_INTERVAL_SECONDS = 15;

export const HEARTBEAT_STORAGE_KEY = 'app.watchdog.last-heartbeat';

export const DEADMAN_NOTIFICATION_ID = 'argus-deadman';

export const DEADMAN_CHANNEL_ID = 'argus-watchdog';

export const HEARTBEAT_BACKGROUND_TASK = 'argus-heartbeat-check';

export const HEARTBEAT_PUSH_TASK = 'argus-heartbeat-push';

export const HEARTBEAT_BACKGROUND_INTERVAL_MINUTES = 15;

export const PANIC_HOLD_MS = 2000;
