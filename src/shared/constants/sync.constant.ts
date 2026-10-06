export const SYNC_OPERATION = {
  InitialInfo: 0,
  Synchronize: 1,
  SynchronizeAuditLog: 2,
  SynchronizeUserAuditLog: 3,
  Add: 4,
  Delete: 5,
  Log: 6,
  AuthContextChanged: 7,
  CallIncoming: 8,
  CallCancel: 9,
  ResponseUpdate: 10,
  Heartbeat: 11,
  ModuleUpdate: 12,
} as const;

export const SYNC_AUDIT_CURSORS_PREFIX = 'app.sync.audit.';

export const SYNC_AUDIT_REQUEST_TYPE = {
  global: 'sync_audit_log',
  user: 'sync_user_audit_log',
} as const;

export const SYNC_CURSORS_PREFIX = 'app.sync.';

export const SYNC_GRANT_SCOPES_PREFIX = 'app.sync.grants.';

export const SYNC_WS_PATH = '/sync';

export const WS_RECONNECT_BASE_MS = 2000;
export const OFFLINE_NOTICE_DELAY_MS = 4000;
export const WS_RECONNECT_MAX_MS = 30000;

export const SYNC_WS_CONNECT_TIMEOUT_MS = 8000;

export const SYNC_BATCH_SIZE = 100;
export const SYNC_PAGE_SIZE = 200;
export const SYNC_PAGE_DELAY_MS = 150;
export const SYNC_MAX_PAGES = 100;
export const SYNC_SCOPE_CHUNK = 50;
export const SYNC_RESPONSE_TIMEOUT_MS = 10000;
