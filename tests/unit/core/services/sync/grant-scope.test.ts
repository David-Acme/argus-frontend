import { describe, expect, test } from 'bun:test';
import {
  buildScopedDto,
  collectScopedPage,
  GRANT_RULES,
  GRANT_TABLES,
  grantsIn,
  hasPending,
  mergePending,
  scopeChunks,
  withoutPending,
  type ScopeCursor,
} from '@/core/services/sync/grant-scope';
import type { ISynchronizedResponse } from '@/core/interfaces';
import type { SyncCreatedRows } from '@/core/types';
import { SYNC_PAGE_SIZE, SYNC_SCOPE_CHUNK } from '@/shared/constants';

const rows = (entries: [string, Record<string, unknown>[]][]): SyncCreatedRows =>
  new Map(entries) as SyncCreatedRows;

describe('grantsIn', () => {
  test('only the grants naming this user open a scope', () => {
    const created = rows([
      [
        'project_member',
        [
          { id: 1, projectId: 7, userId: 12 },
          { id: 2, projectId: 8, userId: 99 },
          { id: 3, projectId: '9', userId: '12' },
          { id: 4, projectId: 7, userId: 12 },
        ],
      ],
      ['calendar_event_share', [{ id: 5, calendarEventId: 30, userId: 12 }]],
      ['project', [{ id: 7, ownerId: 99 }]],
    ]);

    expect(grantsIn(created, '12')).toEqual({ project: ['7', '9'], calendar_event: ['30'] });
    expect(grantsIn(created, '99')).toEqual({ project: ['8'] });
    expect(grantsIn(created, '1')).toEqual({});
  });

  test('a grant without a usable parent id is ignored', () => {
    const created = rows([
      [
        'project_member',
        [
          { id: 1, projectId: null, userId: 12 },
          { id: 2, projectId: -3, userId: 12 },
          { id: 3, projectId: 'x', userId: 12 },
        ],
      ],
    ]);
    expect(hasPending(grantsIn(created, '12'))).toBe(false);
  });
});

describe('pending scopes', () => {
  test('merging keeps each parent once, in id order', () => {
    expect(mergePending({ project: ['9', '2'] }, { project: ['2', '10'], calendar_event: ['4'] })).toEqual({
      project: ['2', '9', '10'],
      calendar_event: ['4'],
    });
  });

  test('a finished chunk leaves the rest pending and an emptied scope disappears', () => {
    const pending = { project: ['1', '2', '3'], calendar_event: ['5'] };
    expect(withoutPending(pending, 'project', ['1', '3'])).toEqual({ project: ['2'], calendar_event: ['5'] });
    expect(withoutPending(pending, 'calendar_event', ['5'])).toEqual({ project: ['1', '2', '3'] });
    expect(hasPending(withoutPending({ project: ['1'] }, 'project', ['1']))).toBe(false);
  });

  test('scopes are pulled in chunks the server accepts', () => {
    const ids = Array.from({ length: SYNC_SCOPE_CHUNK * 2 + 1 }, (_, i) => String(i + 1));
    const chunks = scopeChunks(ids);
    expect(chunks.map((chunk) => chunk.length)).toEqual([SYNC_SCOPE_CHUNK, SYNC_SCOPE_CHUNK, 1]);
    expect(SYNC_SCOPE_CHUNK).toBeLessThanOrEqual(50);
  });
});

describe('scoped pages', () => {
  test('the first page asks for every row of the granted parents', () => {
    expect(buildScopedDto(['project', 'project_task'], ['7', '9'], {})).toEqual({
      project: { requiredCreate: true, scope: [7, 9] },
      project_task: { requiredCreate: true, scope: [7, 9] },
    });
  });

  test('a full page continues after its last row and a short one closes its table', () => {
    const cursor: ScopeCursor = {};
    const tasks = Array.from({ length: SYNC_PAGE_SIZE }, (_, i) => ({ id: i + 1, createdAt: 1000 + i }));
    const response: ISynchronizedResponse = {
      project: { created: [{ id: 7, createdAt: 900 }], deleted: [] },
      project_task: { created: tasks, deleted: [] },
    };
    const page = collectScopedPage(['project', 'project_task'], response, cursor);
    expect(page.open).toEqual(['project_task']);
    expect(page.created.get('project')).toHaveLength(1);
    expect(cursor.project_task).toEqual({ time: 1000 + SYNC_PAGE_SIZE - 1, id: SYNC_PAGE_SIZE });
    expect(buildScopedDto(page.open, ['7'], cursor)).toEqual({
      project_task: {
        requiredCreate: true,
        scope: [7],
        created: { startTime: 1000 + SYNC_PAGE_SIZE - 1, startId: SYNC_PAGE_SIZE },
      },
    });
  });

  test('a table the role cannot read answers null and closes', () => {
    const page = collectScopedPage(['calendar_event'], { calendar_event: null }, {});
    expect(page.open).toEqual([]);
    expect(page.created.get('calendar_event')).toEqual([]);
  });
});

describe('grant rules', () => {
  test('each grant table names a scope that is also the parent table it unlocks', () => {
    expect([...GRANT_TABLES].sort()).toEqual(['calendar_event_share', 'project_member']);
    for (const rule of GRANT_RULES) expect(rule.tables[0]).toBe(rule.scope);
  });
});
