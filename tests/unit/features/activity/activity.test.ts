import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { readActivityPage } from '@/core/contracts/activity.contract';
import type { ActivityFilter, ActivityItem, TranslateFn } from '@/core/types';
import {
  ACTIVITY_PAGE_SIZE,
  activityFilterOf,
  activityQuery,
  activityScope,
  activityWindow,
  EMPTY_ACTIVITY_FILTER,
  isFiltered,
} from '@/features/activity/model/activity-filter';
import { describeActivity, moduleEventOf } from '@/features/activity/model/activity-text';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const NOW = new Date(2026, 9, 6, 15, 30, 0).getTime();
const DAY = 86_400_000;
const sec = (ms: number) => Math.floor(ms / 1000);
const startOfToday = new Date(2026, 9, 6, 0, 0, 0).getTime();

const filter = (patch: Partial<ActivityFilter> = {}): ActivityFilter => ({ ...EMPTY_ACTIVITY_FILTER, ...patch });

const item = (patch: Partial<ActivityItem> = {}): ActivityItem => ({
  id: 10,
  userId: 7,
  recordId: 3,
  table: 'camera',
  module: 'surveillance',
  action: 'create',
  oldData: null,
  newData: {},
  ipAddress: '192.168.1.5',
  createdAt: 1_700_000_000,
  ...patch,
});

describe('activity contract', () => {
  const wire = {
    items: [
      {
        id: 12,
        userId: 1,
        recordId: 0,
        table: 'module',
        module: 'surveillance',
        action: 'update',
        oldData: null,
        newData: { event: 'disabled', lifecycle: 'disabled' },
        ipAddress: '10.0.0.2',
        createdAt: 1_790_000_000,
      },
      { nonsense: true },
    ],
    nextCursor: '1790000000-12',
  };

  test('reads the page, drops what is not a row and keeps the keyset cursor', () => {
    const page = readActivityPage(wire);
    expect(page?.rows).toHaveLength(1);
    expect(page?.rows[0]).toMatchObject({ id: 12, table: 'module', module: 'surveillance', action: 'update' });
    expect(page?.next).toBe('1790000000-12');
  });

  test('the last page has no cursor and an unreadable answer is nothing', () => {
    expect(readActivityPage({ items: [], nextCursor: null })).toEqual({ rows: [], next: null });
    expect(readActivityPage({ items: [], nextCursor: '' })?.next).toBeNull();
    expect(readActivityPage('x')).toBeNull();
  });
});

describe('activity filters', () => {
  test('a period is a window the app measures from now, in unix seconds', () => {
    expect(activityWindow(filter({ period: 'today' }), NOW)).toEqual({ from: sec(startOfToday), to: null });
    expect(activityWindow(filter({ period: 'week' }), NOW).from).toBe(sec(startOfToday - 6 * DAY));
    expect(activityWindow(filter({ period: 'month' }), NOW).from).toBe(sec(startOfToday - 29 * DAY));
    expect(activityWindow(filter({ period: 'all' }), NOW)).toEqual({ from: null, to: null });
  });

  test('a custom range covers whole days and swaps dates given backwards', () => {
    const from = startOfToday - 2 * DAY + 5 * 3_600_000;
    const to = startOfToday - DAY + 9 * 3_600_000;
    expect(activityWindow(filter({ period: 'custom', from, to }), NOW)).toEqual({
      from: sec(startOfToday - 2 * DAY),
      to: sec(startOfToday - DAY + DAY - 1000),
    });
    const swapped = activityWindow(filter({ period: 'custom', from: to, to: from }), NOW);
    expect((swapped.from ?? 0) < (swapped.to ?? 0)).toBe(true);
  });

  test('the query carries only what is chosen, with the limit and the cursor', () => {
    expect(activityQuery(filter({ period: 'all' }), null, NOW)).toBe(`limit=${ACTIVITY_PAGE_SIZE}`);
    const query = activityQuery(
      filter({ module: 'surveillance', userId: 7, action: 'delete', period: 'today' }),
      '1790000000-12',
      NOW,
      20
    );
    expect(query).toBe(
      `module=surveillance&userId=7&action=delete&from=${sec(startOfToday)}&limit=20&cursor=1790000000-12`
    );
  });

  test('a scope remembers the whole filter and reads back the same one', () => {
    const chosen = filter({ module: 'productivity', userId: 3, action: 'update', period: 'custom', from: 5, to: 9 });
    expect(activityFilterOf(activityScope(chosen))).toEqual(chosen);
    expect(activityFilterOf('not json')).toEqual(EMPTY_ACTIVITY_FILTER);
    expect(activityFilterOf('{"a":1}')).toEqual(EMPTY_ACTIVITY_FILTER);
    expect(activityFilterOf('["x","bad","nope","year"]')).toMatchObject({ module: 'x', userId: null, action: null, period: 'week' });
    expect(activityScope(EMPTY_ACTIVITY_FILTER)).not.toBe(activityScope(filter({ period: 'all' })));
  });

  test('knows when something other than the default is chosen', () => {
    expect(isFiltered(EMPTY_ACTIVITY_FILTER)).toBe(false);
    expect(isFiltered(filter({ action: 'read' }))).toBe(true);
    expect(isFiltered(filter({ period: 'all' }))).toBe(true);
  });
});

describe('activity sentences', () => {
  const names = new Map([[7, 'Ana Ruiz']]);
  const moduleName = (id: string) => (id === 'surveillance' ? 'Vigilancia' : id);

  test('says who did what to which thing', () => {
    expect(describeActivity(item(), { names, moduleName, t: es }).title).toBe('Ana Ruiz creó una cámara');
    expect(describeActivity(item({ action: 'update', table: 'project_task' }), { names, moduleName, t: es }).title).toBe(
      'Ana Ruiz cambió una tarea'
    );
    expect(describeActivity(item({ action: 'delete', table: 'user_invitation' }), { names, moduleName, t: en }).title).toBe(
      'Ana Ruiz deleted an invitation'
    );
    expect(describeActivity(item({ action: 'read', table: 'user' }), { names, moduleName, t: es }).title).toBe(
      'Ana Ruiz consultó una cuenta'
    );
  });

  test('a person the directory does not know is named by number and an unknown table says so', () => {
    expect(describeActivity(item({ userId: 99, table: 'strange_table' }), { names, moduleName, t: es }).title).toBe(
      'Usuario 99 creó un elemento (strange_table)'
    );
  });

  test('module actions read as sentences about the module', () => {
    const run = (event: string, lang: TranslateFn = es) =>
      describeActivity(item({ table: 'module', action: 'update', newData: { event } }), { names, moduleName, t: lang }).title;
    expect(run('enabled')).toBe('Ana Ruiz activó Vigilancia');
    expect(run('disabled')).toBe('Ana Ruiz desactivó Vigilancia');
    expect(run('purge')).toBe('Ana Ruiz borró los datos de Vigilancia');
    expect(run('failed', en)).toBe('What Ana Ruiz asked for in Vigilancia could not be completed');
    expect(run('something-new')).toBe('Ana Ruiz cambió Vigilancia');
  });

  test('the event is read from an object or from a JSON string', () => {
    expect(moduleEventOf({ newData: { event: 'Enabled' }, oldData: null })).toBe('enabled');
    expect(moduleEventOf({ newData: '{"event":"paused"}', oldData: null })).toBe('paused');
    expect(moduleEventOf({ newData: null, oldData: { event: 'resumed' } })).toBe('resumed');
    expect(moduleEventOf({ newData: 'not json', oldData: null })).toBeNull();
  });
});
