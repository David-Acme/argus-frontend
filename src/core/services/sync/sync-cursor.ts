import type {
  ISynchronizedDto,
  ISynchronizedResponse,
  ISyncBodyDto,
  ISyncRangeDto,
} from '@/core/interfaces';
import type {
  SyncCreatedRows,
  SyncCursors,
  SyncDeletedRows,
  SyncTableCursor,
  SyncTableKey,
} from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { SYNC_PAGE_SIZE } from '@/shared/constants';
import { SYNC_PROJECTION_VERSION, SYNC_TABLES_WITHOUT_DELETIONS } from './sync-constants';

type SyncPosition = { time: number; id?: number | string };

type SyncTimeField = 'createdAt' | 'deletedAt';

export const secondsOf = (v: unknown): number => {
  const value = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(value) ? Math.floor(value) : 0;
};

export const compareIds = (left?: number | string, right?: number | string): number => {
  if (left == null) return right == null ? 0 : -1;
  if (right == null) return 1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  return String(left).localeCompare(String(right));
};

export const rangeFrom = (start?: number, id?: number | string): ISyncRangeDto | undefined => {
  const startTime = secondsOf(start);
  if (startTime <= 0) return undefined;
  const startId = Number(id);
  return id != null && Number.isSafeInteger(startId) ? { startTime, startId } : { startTime };
};

export const withoutCreatedCursor = (cursor: SyncTableCursor | undefined): SyncTableCursor => ({
  deletedStart: cursor?.deletedStart,
  deletedId: cursor?.deletedId,
  deletedBaseline: cursor?.deletedBaseline,
  projection: SYNC_PROJECTION_VERSION,
});

export const normalizeCursors = (stored: SyncCursors): SyncCursors => {
  const cursors: SyncCursors = {};
  for (const key of SYNC_TABLE_KEYS) {
    const cursor = stored[key];
    if (cursor?.projection === SYNC_PROJECTION_VERSION) {
      cursors[key] = cursor;
      continue;
    }
    cursors[key] = {
      ...withoutCreatedCursor(cursor),
      deletedBaseline: cursor?.deletedStart != null ? true : undefined,
    };
  }
  return cursors;
};

export const maxPosition = (
  rows: Record<string, unknown>[],
  timeField: SyncTimeField
): SyncPosition | null => {
  let result: SyncPosition | null = null;
  for (const row of rows) {
    const time = secondsOf(row[timeField]);
    if (time <= 0) continue;
    const id = row.id as number | string | undefined;
    if (!result || time > result.time || (time === result.time && compareIds(id, result.id) > 0)) {
      result = { time, id };
    }
  }
  return result;
};

export const buildSyncDto = (
  keys: readonly SyncTableKey[],
  cursors: SyncCursors
): ISynchronizedDto => {
  const dto: ISynchronizedDto = {};
  for (const key of keys) {
    const cursor = cursors[key];
    const body: ISyncBodyDto = { requiredCreate: true };
    const created = rangeFrom(cursor?.createdStart, cursor?.createdId);
    if (created) body.created = created;
    if (!SYNC_TABLES_WITHOUT_DELETIONS.has(key)) {
      body.requiredDeleted = true;
      const deleted = rangeFrom(cursor?.deletedStart, cursor?.deletedId);
      if (deleted) body.deleted = deleted;
    }
    dto[key] = body;
  }
  return dto;
};

export const pendingDeletedBaselines = (cursors: SyncCursors): SyncTableKey[] =>
  SYNC_TABLE_KEYS.filter(
    (key) => !SYNC_TABLES_WITHOUT_DELETIONS.has(key) && !cursors[key]?.deletedBaseline
  );

export const buildDeletedBaselineDto = (keys: readonly SyncTableKey[]): ISynchronizedDto => {
  const dto: ISynchronizedDto = {};
  for (const key of keys) dto[key] = { findLastDeleted: true };
  return dto;
};

export const applyDeletedBaselines = (
  keys: readonly SyncTableKey[],
  response: ISynchronizedResponse,
  cursors: SyncCursors
): void => {
  for (const key of keys) {
    const body = response[key];
    if (!body) continue;
    const cursor: SyncTableCursor = { ...cursors[key], deletedBaseline: true };
    const time = secondsOf(body.lastSyncDate?.deleted);
    if (cursor.deletedStart == null && time > 0) {
      cursor.deletedStart = time;
      cursor.deletedId = body.lastSyncDate?.deletedId;
    }
    cursors[key] = cursor;
  }
};

export const collectPageRows = (
  keys: readonly SyncTableKey[],
  response: ISynchronizedResponse
): { created: SyncCreatedRows; deleted: SyncDeletedRows } => {
  const created: SyncCreatedRows = new Map();
  const deleted: SyncDeletedRows = new Map();
  for (const key of keys) {
    const body = response[key];
    if (!body) continue;
    created.set(
      key,
      Array.isArray(body.created) ? (body.created as Record<string, unknown>[]) : []
    );
    deleted.set(key, Array.isArray(body.deleted) ? body.deleted : []);
  }
  return { created, deleted };
};

export const advanceRowCursors = (
  created: SyncCreatedRows,
  deleted: SyncDeletedRows,
  cursors: SyncCursors
): SyncTableKey[] => {
  const more: SyncTableKey[] = [];
  for (const key of created.keys()) {
    const createdRows = created.get(key) ?? [];
    const deletedRows = deleted.get(key) ?? [];
    const cursor: SyncTableCursor = { ...cursors[key] };
    const createdPosition = maxPosition(createdRows, 'createdAt');
    if (createdPosition) {
      cursor.createdStart = createdPosition.time;
      cursor.createdId = createdPosition.id;
    }
    const deletedPosition = maxPosition(
      deletedRows as unknown as Record<string, unknown>[],
      'deletedAt'
    );
    if (deletedPosition) {
      cursor.deletedStart = deletedPosition.time;
      cursor.deletedId = deletedPosition.id;
    }
    cursors[key] = cursor;
    if (createdRows.length >= SYNC_PAGE_SIZE || deletedRows.length >= SYNC_PAGE_SIZE)
      more.push(key);
  }
  return more;
};
