import { describe, expect, test } from 'bun:test';
import {
  ownsProjection,
  ProjectionOwnerStore,
  type ProjectionOwnerStorage,
} from '@/core/services/sync/projection-owner';

const memoryStorage = (): ProjectionOwnerStorage & { values: Map<string, unknown> } => {
  const values = new Map<string, unknown>();
  return {
    values,
    get: async <T,>(key: string) => values.get(key) as T | undefined,
    set: async <T,>(key: string, value: T) => {
      values.set(key, value);
    },
    remove: async (key: string) => {
      values.delete(key);
    },
  };
};

describe('projection owner', () => {
  test('a projection belongs to the user and role it was built for', () => {
    const owner = { userId: '1', role: 'owner' };
    expect(ownsProjection(owner, { userId: '1', role: 'owner' })).toBe(true);
    expect(ownsProjection(owner, { userId: '1', role: 'guard' })).toBe(false);
    expect(ownsProjection(owner, { userId: '2', role: 'owner' })).toBe(false);
    expect(ownsProjection(null, { userId: '1', role: 'owner' })).toBe(false);
  });

  test('the store forgets the owner and ignores a malformed record', async () => {
    const storage = memoryStorage();
    const store = new ProjectionOwnerStore(storage);
    expect(await store.read()).toBeNull();
    await store.write({ userId: '7', role: 'resident' });
    expect(await store.read()).toEqual({ userId: '7', role: 'resident' });
    await store.forget();
    expect(await store.read()).toBeNull();
    storage.values.set('argus.sync.projection-owner', { userId: 7 });
    expect(await store.read()).toBeNull();
  });
});
