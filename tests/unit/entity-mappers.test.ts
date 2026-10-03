import { describe, expect, test } from 'bun:test';
import { toModelProps } from '@/core/services/sync/entity-mappers';

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
