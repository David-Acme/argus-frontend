import { describe, expect, test } from 'bun:test';
import { knowsTable, toDirtyRaw, toModelProps, toPartialModelProps } from '@/core/services/sync/entity-mappers';

describe('toModelProps', () => {
  test('a null optional timestamp stays null instead of becoming epoch zero', () => {
    const props = toModelProps('project_task', { id: 1, dueAt: null, createdAt: 1790376572 });
    expect(props.dueAt).toBeNull();
  });

  test('a timestamp in seconds becomes epoch milliseconds', () => {
    const props = toModelProps('project_task', { id: 1, dueAt: 1791068400 });
    expect(props.dueAt).toBe(1791068400000);
  });
});

describe('toDirtyRaw', () => {
  test('every JSON column is stored as its serialized text', () => {
    const camera = toDirtyRaw('camera', { id: 1, capabilities: ['ptz'], config: { streamPath: '/s1' } });
    expect(camera.capabilities).toBe('["ptz"]');
    expect(camera.config).toBe('{"streamPath":"/s1"}');
    const notification = toDirtyRaw('notification', { id: 9, data: '{"kind":"guard"}' });
    expect(notification.data).toBe('{"kind":"guard"}');
  });
});

describe('a table this build does not know', () => {
  test('is never mapped and never throws', () => {
    expect(knowsTable('event')).toBe(false);
    expect(knowsTable('camera')).toBe(true);
    expect(knowsTable('toString')).toBe(false);
    expect(knowsTable('constructor')).toBe(false);
    expect(knowsTable('__proto__')).toBe(false);
  });
});

describe('recurrence exceptions', () => {
  const wire = JSON.stringify([
    { occurrence: 1791205200, cancelled: false, startsAt: 1791212400, endsAt: 1791216000, title: 'Movida' },
    { occurrence: 1790600400, cancelled: true, title: 'ignored' },
    { occurrence: 'x' },
    { occurrence: 1791810000 },
  ]);

  test('the series row text becomes instants in milliseconds, sorted, without what cannot be read', () => {
    expect(toModelProps('calendar_event', { id: 4, recurrenceExceptions: wire }).recurrenceExceptions).toEqual([
      { occurrence: 1790600400000, cancelled: true },
      {
        occurrence: 1791205200000,
        cancelled: false,
        startsAt: 1791212400000,
        endsAt: 1791216000000,
        title: 'Movida',
      },
    ]);
    expect(toModelProps('calendar_event', { id: 5, recurrenceExceptions: '[]' }).recurrenceExceptions).toEqual([]);
    expect(toModelProps('calendar_event', { id: 5 }).recurrenceExceptions).toEqual([]);
    expect(toModelProps('calendar_event', { id: 5, recurrenceExceptions: 'not json' }).recurrenceExceptions).toEqual([]);
  });

  test('the local row stores them as JSON text and an audit diff replaces them whole', () => {
    const raw = toDirtyRaw('calendar_event', {
      id: 5,
      recurrenceExceptions: JSON.stringify([{ occurrence: 1790600400, cancelled: true }]),
    });
    expect(raw.recurrence_exceptions).toBe('[{"occurrence":1790600400000,"cancelled":true}]');
    const patch = toPartialModelProps('calendar_event', {
      recurrenceExceptions: JSON.stringify([{ occurrence: 1790600400, cancelled: false, startsAt: 1790604000 }]),
    });
    expect(patch).toEqual({
      recurrenceExceptions: [{ occurrence: 1790600400000, cancelled: false, startsAt: 1790604000000 }],
    });
  });
});

describe('how a task or an event was made', () => {
  test('assistant is kept, and anything else, absent included, reads as the app', () => {
    expect(toModelProps('project_task', { id: 1, createdVia: 'assistant' }).createdVia).toBe('assistant');
    expect(toModelProps('calendar_event', { id: 2, createdVia: 'assistant' }).createdVia).toBe('assistant');
    expect(toModelProps('calendar_event', { id: 2, createdVia: 'app' }).createdVia).toBe('app');
    expect(toModelProps('project_task', { id: 1 }).createdVia).toBe('app');
    expect(toModelProps('project_task', { id: 1, createdVia: 'robot' }).createdVia).toBe('app');
    expect(toDirtyRaw('project_task', { id: 1, createdVia: 'assistant' }).created_via).toBe('assistant');
  });
});
