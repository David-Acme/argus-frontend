import type { AuditLogCursor, AuditLogRequest, AuditLogRow } from '@/core/types';

export type { AuditLogCursor, AuditLogRequest, AuditLogRow } from '@/core/types';

export const buildAuditRequest = (
  cursor: AuditLogCursor | null,
): AuditLogRequest => {
  if (!cursor) return { findLast: true };
  return { afterId: cursor.lastId, endId: cursor.watermarkId };
};

export const advanceAuditCursor = (
  cursor: AuditLogCursor,
  rows: AuditLogRow[],
): AuditLogCursor => {
  const lastId = rows.length > 0 ? rows[rows.length - 1].id : cursor.lastId;
  return { ...cursor, lastId };
};
