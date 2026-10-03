import { describe, expect, test } from 'bun:test';
import {
  applyIntents,
  defineLens,
  isPendingRow,
  OptimisticRegistry,
  pendingKeys,
  settledIntents,
  type OptimisticSchedule,
} from '@/shared/libs/optimistic';

type TaskRow = { id: string; title: string; status: string };
type TaskValues = { title: string; status: string };

const taskLens = defineLens<TaskRow, TaskValues>({
  table: 'project_task',
  recordIdOf: (row) => row.id,
  patch: (row, values) => ({
    ...row,
    title: values.title ?? row.title,
    status: values.status ?? row.status,
  }),
  create: (recordId, values) => ({
    id: recordId,
    title: values.title ?? '',
    status: values.status ?? 'todo',
  }),
});

const lenses = [taskLens];

function manualClock() {
  let now = 0;
  const tasks: { at: number; run: () => void; cancelled: boolean }[] = [];
  const schedule: OptimisticSchedule = (run, delayMs) => {
    const task = { at: now + delayMs, run, cancelled: false };
    tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  };
  const advance = (ms: number) => {
    now += ms;
    for (const task of tasks) {
      if (task.cancelled || task.at > now) continue;
      task.cancelled = true;
      task.run();
    }
  };
  return { schedule, advance };
}

function registry() {
  const clock = manualClock();
  return {
    clock,
    store: new OptimisticRegistry({ schedule: clock.schedule, ttlMs: 60_000, graceMs: 600 }),
  };
}

const base: TaskRow[] = [
  { id: '1', title: 'Water the plants', status: 'todo' },
  { id: '2', title: 'Fix the gate', status: 'doing' },
];

describe('applyIntents', () => {
  test('rows without intents keep their reference', () => {
    const { store } = registry();
    store.begin({ table: 'calendar_event', kind: 'delete', recordId: '1' });
    expect(applyIntents(base, store.snapshot(), lenses)).toBe(base);
    expect(applyIntents(base, [], lenses)).toBe(base);
  });

  test('an update patches its row and a delete hides it', () => {
    const { store } = registry();
    store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    store.begin({ table: 'project_task', kind: 'delete', recordId: '2' });
    expect(applyIntents(base, store.snapshot(), lenses)).toEqual([
      { id: '1', title: 'Water the plants', status: 'done' },
    ]);
  });

  test('an update that changes nothing keeps the reference', () => {
    const { store } = registry();
    store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'todo' },
    });
    expect(applyIntents(base, store.snapshot(), lenses)).toBe(base);
  });

  test('a pending create appears under a temporary id and is marked pending', () => {
    const { store } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'create',
      values: { title: 'Call the plumber' },
    });
    const rows = applyIntents(base, store.snapshot(), lenses);
    expect(rows).toHaveLength(3);
    const created = rows[2];
    expect(created?.id).toBe(intent.recordId);
    expect(created && isPendingRow(created, pendingKeys(store.snapshot()), lenses)).toBe(true);
    expect(isPendingRow(base[0] as TaskRow, pendingKeys(store.snapshot()), lenses)).toBe(false);
  });

  test('a create whose lens declines the row stays out of the view', () => {
    const { store } = registry();
    const scoped = defineLens<TaskRow, TaskValues>({ ...taskLens, create: () => null });
    store.begin({ table: 'project_task', kind: 'create', values: { title: 'Elsewhere' } });
    expect(applyIntents(base, store.snapshot(), [scoped])).toBe(base);
  });

  test('a compare function orders the merged rows', () => {
    const { store } = registry();
    store.begin({ table: 'project_task', kind: 'create', values: { title: 'Answer the door' } });
    const rows = applyIntents(base, store.snapshot(), lenses, (left, right) =>
      left.title.localeCompare(right.title)
    );
    expect(rows.map((row) => row.title)).toEqual([
      'Answer the door',
      'Fix the gate',
      'Water the plants',
    ]);
  });
});

describe('create reconciliation', () => {
  test('the sync Add landing after the HTTP response never shows a second row', () => {
    const { store } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'create',
      values: { title: 'Buy bulbs', status: 'todo' },
    });
    store.confirm(intent.id, '42');
    expect(applyIntents(base, store.snapshot(), lenses).map((row) => row.id)).toEqual([
      '1',
      '2',
      '42',
    ]);
    const synced = [...base, { id: '42', title: 'Buy bulbs', status: 'todo' }];
    expect(applyIntents(synced, store.snapshot(), lenses)).toBe(synced);
    expect(settledIntents(synced, store.snapshot(), lenses)).toEqual([intent.id]);
  });

  test('the sync Add landing before the HTTP response hides the pending copy', () => {
    const { store } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'create',
      values: { title: 'Buy bulbs', status: 'todo' },
    });
    const synced = [...base, { id: '42', title: 'Buy bulbs', status: 'todo' }];
    expect(applyIntents(synced, store.snapshot(), lenses)).toBe(synced);
    expect(settledIntents(synced, store.snapshot(), lenses)).toEqual([]);
    store.confirm(intent.id, '42');
    expect(applyIntents(synced, store.snapshot(), lenses)).toBe(synced);
    expect(settledIntents(synced, store.snapshot(), lenses)).toEqual([intent.id]);
  });

  test('an update on a just-created row rides on the created copy', () => {
    const { store } = registry();
    const created = store.begin({
      table: 'project_task',
      kind: 'create',
      values: { title: 'Paint' },
    });
    store.confirm(created.id, '7');
    store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '7',
      values: { status: 'done' },
    });
    expect(applyIntents(base, store.snapshot(), lenses)[2]).toEqual({
      id: '7',
      title: 'Paint',
      status: 'done',
    });
  });
});

describe('ordering and refusals', () => {
  test('a refused intent rolls back alone, out of order', () => {
    const { store } = registry();
    const first = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    const second = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { title: 'Water the garden' },
    });
    store.confirm(second.id);
    store.rollback(first.id);
    expect(applyIntents(base, store.snapshot(), lenses)[0]).toEqual({
      id: '1',
      title: 'Water the garden',
      status: 'todo',
    });
  });

  test('a later intent settles only after the earlier ones on its record', () => {
    const { store } = registry();
    const done = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    const reopened = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'todo' },
    });
    store.confirm(reopened.id);
    store.confirm(done.id);
    expect(settledIntents(base, store.snapshot(), lenses)).toEqual([]);
    const afterFirst = [{ ...base[0], status: 'done' } as TaskRow, base[1] as TaskRow];
    expect(settledIntents(afterFirst, store.snapshot(), lenses)).toEqual([done.id]);
    expect(applyIntents(afterFirst, store.snapshot(), lenses)[0]?.status).toBe('todo');
  });

  test('an unconfirmed intent never settles, even when the row already matches', () => {
    const { store } = registry();
    store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'todo' },
    });
    expect(settledIntents(base, store.snapshot(), lenses)).toEqual([]);
  });

  test('a confirmed delete waits for its expiry instead of reading absence as proof', () => {
    const { store } = registry();
    const removed = store.begin({ table: 'project_task', kind: 'delete', recordId: '2' });
    store.confirm(removed.id);
    expect(settledIntents([base[0] as TaskRow], store.snapshot(), lenses)).toEqual([]);
  });
});

describe('OptimisticRegistry lifecycle', () => {
  test('a refusal removes the intent at once', () => {
    const { store } = registry();
    const intent = store.begin({ table: 'project_task', kind: 'delete', recordId: '1' });
    store.rollback(intent.id);
    expect(store.snapshot()).toEqual([]);
  });

  test('a confirmed intent expires after the TTL when the sync never proves it', () => {
    const { store, clock } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    clock.advance(120_000);
    expect(store.snapshot()).toHaveLength(1);
    store.confirm(intent.id);
    clock.advance(59_999);
    expect(store.snapshot()).toHaveLength(1);
    clock.advance(1);
    expect(store.snapshot()).toEqual([]);
  });

  test('a settled intent leaves after the grace period, not the TTL', () => {
    const { store, clock } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    store.confirm(intent.id);
    store.settle([intent.id]);
    store.settle([intent.id]);
    clock.advance(600);
    expect(store.snapshot()).toEqual([]);
  });

  test('confirming twice or after a rollback changes nothing', () => {
    const { store } = registry();
    const intent = store.begin({
      table: 'project_task',
      kind: 'create',
      values: { title: 'Once' },
    });
    store.confirm(intent.id, '9');
    store.confirm(intent.id, '10');
    expect(store.snapshot()[0]?.recordId).toBe('9');
    store.rollback(intent.id);
    store.confirm(intent.id, '11');
    expect(store.snapshot()).toEqual([]);
  });

  test('a user change clears every intent and its timers', () => {
    const { store, clock } = registry();
    store.bindSession('1');
    const intent = store.begin({
      table: 'project_task',
      kind: 'update',
      recordId: '1',
      values: { status: 'done' },
    });
    store.confirm(intent.id);
    store.bindSession('1');
    expect(store.snapshot()).toHaveLength(1);
    store.bindSession('2');
    expect(store.snapshot()).toEqual([]);
    const next = store.begin({ table: 'project_task', kind: 'delete', recordId: '2' });
    clock.advance(60_000);
    expect(store.snapshot().map((entry) => entry.id)).toEqual([next.id]);
  });

  test('subscribers hear every change and can leave', () => {
    const { store } = registry();
    let calls = 0;
    const leave = store.subscribe(() => {
      calls += 1;
    });
    const intent = store.begin({ table: 'project_task', kind: 'delete', recordId: '1' });
    store.rollback(intent.id);
    leave();
    store.begin({ table: 'project_task', kind: 'delete', recordId: '1' });
    expect(calls).toBe(2);
  });
});

describe('placement', () => {
  test('a prepending lens puts the newest create first', () => {
    const { store } = registry();
    const newestFirst = defineLens<TaskRow, TaskValues>({ ...taskLens, prepend: true });
    store.begin({ table: 'project_task', kind: 'create', values: { title: 'Older' } });
    store.begin({ table: 'project_task', kind: 'create', values: { title: 'Newer' } });
    expect(applyIntents(base, store.snapshot(), [newestFirst]).map((row) => row.title)).toEqual([
      'Newer',
      'Older',
      'Water the plants',
      'Fix the gate',
    ]);
  });
});

describe('row equality', () => {
  test('a key holding undefined equals a missing key, as rows read back from the cache lose them', () => {
    type Entry = { id: string; title: string; location?: string };
    const lens = defineLens<Entry, { title: string; location: string }>({
      table: 'calendar_event',
      recordIdOf: (row) => row.id,
      patch: (row, values) => ({
        ...row,
        title: values.title ?? row.title,
        location: values.location || undefined,
      }),
      create: (recordId, values) => ({
        id: recordId,
        title: values.title ?? '',
        location: values.location || undefined,
      }),
    });
    const { store } = registry();
    const intent = store.begin({
      table: 'calendar_event',
      kind: 'create',
      values: { title: 'Dentist', location: '' },
    });
    store.confirm(intent.id, '5');
    const synced: Entry[] = [{ id: '5', title: 'Dentist' }];
    expect(applyIntents(synced, store.snapshot(), [lens])).toBe(synced);
    expect(settledIntents(synced, store.snapshot(), [lens])).toEqual([intent.id]);
  });
});
