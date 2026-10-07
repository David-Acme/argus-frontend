import { describe, expect, test } from 'bun:test';
import { toDirtyRaw, toModelProps } from '@/core/services/sync/entity-mappers';

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
    const event = toDirtyRaw('event', { id: 3, details: { camera: 2, label: 'person' } });
    expect(event.details).toBe('{"camera":2,"label":"person"}');
    const camera = toDirtyRaw('camera', { id: 1, capabilities: ['ptz'], config: { streamPath: '/s1' } });
    expect(camera.capabilities).toBe('["ptz"]');
    expect(camera.config).toBe('{"streamPath":"/s1"}');
    const notification = toDirtyRaw('notification', { id: 9, data: '{"kind":"guard"}' });
    expect(notification.data).toBe('{"kind":"guard"}');
  });
});
