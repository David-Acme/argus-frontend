import type { ISynchronizedDto, ISynchronizedResponse } from '@/core/interfaces';
import type {
  GrantScopeKey,
  PendingGrantScopes,
  SyncCreatedRows,
  SyncTableKey,
} from '@/core/types';
import { SYNC_PAGE_SIZE, SYNC_SCOPE_CHUNK } from '@/shared/constants';
import { maxPosition, rangeFrom } from './sync-cursor';

export type GrantCascade = { table: SyncTableKey; column: string };

export type GrantRule = {
  grant: SyncTableKey;
  grantParentField: string;
  grantParentColumn: string;
  scope: GrantScopeKey;
  tables: readonly SyncTableKey[];
  cascade: readonly GrantCascade[];
};

export const GRANT_RULES: readonly GrantRule[] = [
  {
    grant: 'project_member',
    grantParentField: 'projectId',
    grantParentColumn: 'project_id',
    scope: 'project',
    tables: ['project', 'project_task'],
    cascade: [
      { table: 'project_task', column: 'project_id' },
      { table: 'project_member', column: 'project_id' },
    ],
  },
  {
    grant: 'calendar_event_share',
    grantParentField: 'calendarEventId',
    grantParentColumn: 'calendar_event_id',
    scope: 'calendar_event',
    tables: ['calendar_event'],
    cascade: [{ table: 'calendar_event_share', column: 'calendar_event_id' }],
  },
];

export const GRANT_TABLES: ReadonlySet<SyncTableKey> = new Set(GRANT_RULES.map((rule) => rule.grant));

export type ScopePosition = { time: number; id?: number | string };

export type ScopeCursor = Partial<Record<SyncTableKey, ScopePosition>>;

const positiveId = (value: unknown): string | null => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
};

const unique = (ids: readonly string[]): string[] =>
  [...new Set(ids)].sort((left, right) => Number(left) - Number(right));

export const grantsIn = (created: SyncCreatedRows, userId: string): PendingGrantScopes => {
  const found: PendingGrantScopes = {};
  for (const rule of GRANT_RULES) {
    const ids: string[] = [];
    for (const row of created.get(rule.grant) ?? []) {
      if (String(row.userId) !== userId) continue;
      const parent = positiveId(row[rule.grantParentField]);
      if (parent) ids.push(parent);
    }
    if (ids.length > 0) found[rule.scope] = unique(ids);
  }
  return found;
};

export const mergePending = (
  left: PendingGrantScopes,
  right: PendingGrantScopes
): PendingGrantScopes => {
  const merged: PendingGrantScopes = {};
  for (const rule of GRANT_RULES) {
    const ids = unique([...(left[rule.scope] ?? []), ...(right[rule.scope] ?? [])]);
    if (ids.length > 0) merged[rule.scope] = ids;
  }
  return merged;
};

export const hasPending = (pending: PendingGrantScopes): boolean =>
  GRANT_RULES.some((rule) => (pending[rule.scope]?.length ?? 0) > 0);

export const withoutPending = (
  pending: PendingGrantScopes,
  scope: GrantScopeKey,
  done: readonly string[]
): PendingGrantScopes => {
  const finished = new Set(done);
  const rest = (pending[scope] ?? []).filter((id) => !finished.has(id));
  const next: PendingGrantScopes = { ...pending };
  if (rest.length > 0) next[scope] = rest;
  else delete next[scope];
  return next;
};

export const scopeChunks = (ids: readonly string[]): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += SYNC_SCOPE_CHUNK) chunks.push(ids.slice(i, i + SYNC_SCOPE_CHUNK));
  return chunks;
};

export const buildScopedDto = (
  tables: readonly SyncTableKey[],
  ids: readonly string[],
  cursor: ScopeCursor
): ISynchronizedDto => {
  const scope = ids.map(Number);
  const dto: ISynchronizedDto = {};
  for (const table of tables) {
    const position = cursor[table];
    const created = rangeFrom(position?.time, position?.id);
    dto[table] = created ? { requiredCreate: true, scope, created } : { requiredCreate: true, scope };
  }
  return dto;
};

export const collectScopedPage = (
  tables: readonly SyncTableKey[],
  response: ISynchronizedResponse,
  cursor: ScopeCursor
): { created: SyncCreatedRows; open: SyncTableKey[] } => {
  const created: SyncCreatedRows = new Map();
  const open: SyncTableKey[] = [];
  for (const table of tables) {
    const body = response[table];
    const rows = Array.isArray(body?.created) ? (body.created as Record<string, unknown>[]) : [];
    created.set(table, rows);
    const position = maxPosition(rows, 'createdAt');
    if (position) cursor[table] = position;
    if (rows.length >= SYNC_PAGE_SIZE && position) open.push(table);
  }
  return { created, open };
};
