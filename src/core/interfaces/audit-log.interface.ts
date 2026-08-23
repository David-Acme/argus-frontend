export interface IAuditLogChange {
  previous?: unknown;
  current?: unknown;
}

export interface IAuditLogEntry {
  id: number;
  recordId: number | string;
  tableName: string;
  changes: Record<string, IAuditLogChange>;
}

export interface IAuditLogSyncResponse {
  info: IAuditLogEntry[];
  nextCursorId?: number;
  watermarkId?: number;
}
