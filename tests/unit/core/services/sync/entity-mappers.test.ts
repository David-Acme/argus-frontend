import { describe, expect, test } from 'bun:test';
import { knowsTable, toDirtyRaw, toModelProps } from '@/core/services/sync/entity-mappers';

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
