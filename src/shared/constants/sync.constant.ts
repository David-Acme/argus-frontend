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
