import { beforeEach, describe, expect, mock, test } from 'bun:test';

const memory = new Map<string, string>();

mock.module('@/core/services/storage', () => ({
  storageService: {
    set: (key: string, value: string) => memory.set(key, String(value)),
    getString: (key: string) => memory.get(key) ?? null,
    getObject: (key: string) => (memory.has(key) ? JSON.parse(memory.get(key) as string) : null),
    remove: (key: string) => memory.delete(key),
    getAllKeys: () => [...memory.keys()],
  },
}));

const { viewCacheService } = await import('@/core/services/view-cache.service');

describe('viewCacheService', () => {
  beforeEach(() => {
    memory.clear();
    viewCacheService.setUserId('u1');
  });

  test('an identical write keeps the snapshot reference and does not notify', () => {
    let notified = 0;
    const unsubscribe = viewCacheService.subscribe('project.list', undefined, () => {
      notified += 1;
    });
    viewCacheService.write('project.list', [{ id: '1' }]);
    const first = viewCacheService.rowsSnapshot('project.list');
    viewCacheService.write('project.list', [{ id: '1' }]);
    expect(notified).toBe(1);
    expect(viewCacheService.rowsSnapshot('project.list')).toBe(first);
    viewCacheService.write('project.list', [{ id: '2' }]);
    expect(notified).toBe(2);
    expect(viewCacheService.rowsSnapshot('project.list')).not.toBe(first);
    unsubscribe();
  });

  test('values follow the same rule', () => {
    let notified = 0;
    const unsubscribe = viewCacheService.subscribe('dashboard.unread', undefined, () => {
      notified += 1;
    });
    viewCacheService.writeValue('dashboard.unread', 3);
    viewCacheService.writeValue('dashboard.unread', 3);
    expect(notified).toBe(1);
    expect(viewCacheService.valueSnapshot<number>('dashboard.unread')).toBe(3);
    unsubscribe();
  });
});

describe('clearing the view cache', () => {
  beforeEach(() => {
    memory.clear();
    viewCacheService.setUserId('u1');
  });

  test('a context resync keeps the access keys of this user and drops every other view', () => {
    viewCacheService.writeValue('app.context', { role: 'owner' });
    viewCacheService.writeValue('modules.catalog', { modules: [] });
    viewCacheService.write('project.list', [{ id: '1' }]);
    viewCacheService.write('project.tasks', [{ id: 't' }], 'p1');
    viewCacheService.clear(['app.context', 'modules.catalog']);
    expect(viewCacheService.readValue<{ role: string }>('app.context')).toEqual({ role: 'owner' });
    expect(viewCacheService.readValue<{ modules: string[] }>('modules.catalog')).toEqual({ modules: [] });
    expect(viewCacheService.read('project.list')).toEqual([]);
    expect(viewCacheService.read('project.tasks', 'p1')).toEqual([]);
  });

  test('a full clear, as a session end does, wipes the access keys too', () => {
    viewCacheService.writeValue('app.context', { role: 'owner' });
    viewCacheService.clear();
    expect(viewCacheService.readValue('app.context')).toBeNull();
  });
});

describe('applyWrites', () => {
  test('a tracked key drops the scopes the projection no longer writes', async () => {
    const { applyWrites } = await import('@/core/services/view-cache/projection');
    viewCacheService.setUserId('u1');
    applyWrites(
      [
        { key: 'project.tasks', scope: 'p1', rows: [{ id: 't1' }] },
        { key: 'project.tasks', scope: 'p2', rows: [] },
      ],
      ['project.tasks'],
    );
    applyWrites([{ key: 'project.tasks', scope: 'p1', rows: [{ id: 't1' }] }], ['project.tasks']);
    expect([...memory.keys()].filter((key) => key.includes('project.tasks'))).toEqual([
      'view.cache.v2.u1.project.tasks.p1',
    ]);
  });
});
