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
