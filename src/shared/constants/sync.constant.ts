export const SYNC_OPERATION = {
  InitialInfo: 0,
  Synchronize: 1,
  SynchronizeAuditLog: 2,
  SynchronizeUserAuditLog: 3,
  Add: 4,
  Delete: 5,
  Log: 6,
  AuthContextChanged: 7,
} as const;

/** Per-user cursor namespace for incremental audit streams. */
export const SYNC_AUDIT_CURSORS_PREFIX = 'app.sync.audit.';

export const SYNC_AUDIT_REQUEST_TYPE = {
  global: 'sync_audit_log',
  user: 'sync_user_audit_log',
} as const;

/** Cursor namespace covering every per-table incremental cursor. */
export const SYNC_CURSORS_PREFIX = 'app.sync.';

/** Socket endpoint served by the backend. */
export const SYNC_WS_PATH = '/sync';

/** Reconnect backoff: doubles per attempt, capped at the max. */
export const WS_RECONNECT_BASE_MS = 2000;
export const WS_RECONNECT_MAX_MS = 30000;

/** Opening the socket gives up after this long and schedules a reconnect. */
export const SYNC_WS_CONNECT_TIMEOUT_MS = 8000;

export const SYNC_BATCH_SIZE = 100;
export const SYNC_PAGE_SIZE = 200;
export const SYNC_PAGE_DELAY_MS = 150;
// Keep the first sync bounded, but allow normal installations with several
// thousand rows to finish without silently declaring a partial sync complete.
export const SYNC_MAX_PAGES = 100;
export const SYNC_RESPONSE_TIMEOUT_MS = 10000;
