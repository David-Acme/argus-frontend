import type { SyncTableKey } from '@/core/types';
import { sanitizeObject, sanitizeStringArray, sanitizeZonePoints } from '@/core/database/tables/sanitizers';

export type FieldTransform = (value: unknown) => unknown;
export type EntityFieldMap = Record<string, FieldTransform>;

const toStr = (v: unknown): string => (v == null ? '' : String(v));
export const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const normalized = v.trim().toLowerCase();
    if (['false', '0', 'no', 'off', 'null', 'undefined', ''].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return Boolean(v);
};
const finiteNumber = (v: unknown): number | null => {
  const value = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(value) ? value : null;
};
const toNum = (v: unknown): number => finiteNumber(v) ?? 0;
const toOptNum = (v: unknown): number | null => finiteNumber(v);
const toOptStr = (v: unknown): string | null => (v == null ? null : String(v));
const toMs = (v: unknown): number => {
  const value = finiteNumber(v);
  return value == null ? 0 : Math.round(value * 1000);
};
const toOptDate = (v: unknown): Date | null => {
  const value = finiteNumber(v);
  return value == null ? null : new Date(value * 1000);
};

const parseJson = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const toStringArray = (v: unknown): string[] => sanitizeStringArray(parseJson(v));
const toObject = (v: unknown): Record<string, unknown> => sanitizeObject(parseJson(v));
const toZonePoints = (v: unknown): ReturnType<typeof sanitizeZonePoints> => sanitizeZonePoints(parseJson(v));

export const TABLE_MAPS: Record<SyncTableKey, EntityFieldMap> = {
  user: {
    name: toStr,
    lastName: toStr,
    role: toStr,
    isActive: toBool,
    createdAt: toMs,
    updatedAt: toMs,
  },
  user_invitation: {
    role: toStr,
    maxRedemptions: toNum,
    redemptionCount: toNum,
    expiresAt: toMs,
    createdBy: toStr,
    revokedAt: toOptDate,
    createdAt: toMs,
    updatedAt: toMs,
  },
  camera: {
    name: toStr,
    cloudUsername: toStr,
    driver: toStr,
    icon: toStr,
    manufacturer: toStr,
    model: toStr,
    ip: toStr,
    port: toNum,
    username: toStr,
    recordMode: toStr,
    retentionDays: toOptNum,
    capabilities: toStringArray,
    config: toObject,
    isEnabled: toBool,
    isOnline: toBool,
    createdAt: toMs,
    updatedAt: toMs,
  },
  camera_stream: {
    cameraId: toStr,
    label: toStr,
    url: toStr,
    resolution: toStr,
    fps: toNum,
    codec: toStr,
    isPrimary: toBool,
    isEnabled: toBool,
    createdAt: toMs,
    updatedAt: toMs,
  },
  zone: {
    cameraId: toStr,
    name: toStr,
    points: toZonePoints,
    zoneType: toStr,
    color: toStr,
    isEnabled: toBool,
    createdAt: toMs,
    updatedAt: toMs,
  },
  reminder: {
    createdBy: toOptStr,
    targetUserId: toStr,
    title: toStr,
    description: toStr,
    scheduledAt: toMs,
    recurrenceRule: toOptStr,
    isCompleted: toBool,
    completedAt: toOptDate,
    createdAt: toMs,
    updatedAt: toMs,
  },
  reminder_detail: {
    reminderId: toStr,
    createdBy: toOptStr,
    content: toStr,
    status: toStr,
    filePaths: toStringArray,
    createdAt: toMs,
    updatedAt: toMs,
  },
  calendar_event: {
    createdBy: toOptStr,
    ownerId: toStr,
    projectId: toOptStr,
    title: toStr,
    description: toStr,
    location: toStr,
    color: toStr,
    startsAt: toMs,
    endsAt: toOptDate,
    isAllDay: toBool,
    recurrenceRule: toOptStr,
    createdAt: toMs,
    updatedAt: toMs,
  },
  project: {
    ownerId: toStr,
    name: toStr,
    description: toStr,
    status: toStr,
    color: toStr,
    startsAt: toOptDate,
    targetAt: toOptDate,
    createdAt: toMs,
    updatedAt: toMs,
  },
  calendar_event_share: {
    calendarEventId: toStr,
    userId: toStr,
    access: toStr,
    createdAt: toMs,
    updatedAt: toMs,
  },
  project_member: {
    projectId: toStr,
    userId: toStr,
    access: toStr,
    createdAt: toMs,
    updatedAt: toMs,
  },
  project_task: {
    projectId: toStr,
    createdBy: toOptStr,
    assigneeId: toOptStr,
    title: toStr,
    status: toStr,
    priority: toStr,
    dueAt: toOptDate,
    sortOrder: toNum,
    createdAt: toMs,
    updatedAt: toMs,
  },
  event: {
    eventType: toStr,
    severity: toStr,
    source: toStr,
    summary: toStr,
    details: toObject,
    occurredAt: toMs,
    createdAt: toMs,
    updatedAt: toMs,
  },
  person: {
    userId: toOptStr,
    name: toStr,
    alias: toStr,
    observation: toStr,
    firstSeenAt: toMs,
    lastSeenAt: toMs,
    createdAt: toMs,
    updatedAt: toMs,
  },
  notification: {
    userId: toStr,
    type: toStr,
    title: toStr,
    body: toStr,
    data: toObject,
    isRead: toBool,
    readAt: toOptDate,
    createdAt: toMs,
  },
};

/** `string` columns that store JSON (sanitizers receive them already parsed). */
const JSON_COLUMNS = new Set(['capabilities', 'config', 'points', 'file_paths', 'data']);

const toSnake = (prop: string): string => prop.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** snake_case columns ready for `prepareCreateFromDirtyRaw` (id = server id string). */
export const toDirtyRaw = (key: SyncTableKey, row: Record<string, unknown>): Record<string, unknown> => {
  const raw: Record<string, unknown> = { id: String(row.id) };
  for (const [prop, transform] of Object.entries(TABLE_MAPS[key])) {
    const column = toSnake(prop);
    const value = transform(row[prop]);
    raw[column] = JSON_COLUMNS.has(column) && value != null ? JSON.stringify(value) : value;
  }
  return raw;
};

/** camelCase model props ready for `prepareUpdate` (decorators serialize). */
export const toModelProps = (key: SyncTableKey, row: Record<string, unknown>): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const [prop, transform] of Object.entries(TABLE_MAPS[key])) {
    props[prop] = transform(row[prop]);
  }
  return props;
};

/** Maps an audit patch without materialising defaults for fields it does not contain. */
export const toPartialModelProps = (
  key: SyncTableKey,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const [prop, transform] of Object.entries(TABLE_MAPS[key])) {
    if (Object.prototype.hasOwnProperty.call(row, prop)) {
      props[prop] = transform(row[prop]);
    }
  }
  return props;
};
