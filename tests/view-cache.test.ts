import { describe, expect, test } from 'bun:test';
import { ViewCacheMemory } from '../src/core/services/view-cache-memory';

describe('ViewCacheMemory', () => {
  test('hydrates a persisted snapshot into fast memory before a live query answers', () => {
    const cache = new ViewCacheMemory();

    cache.hydrate([
      ['view.cache.dashboard.projects.42', [{ id: 'cached-project', name: 'Renovation' }]],
    ]);

    expect(cache.read<{ id: string; name: string }>('view.cache.dashboard.projects.42')).toEqual([
      { id: 'cached-project', name: 'Renovation' },
    ]);
  });

  test('replaces the startup snapshot when local reactive data changes', () => {
    const cache = new ViewCacheMemory();
    cache.hydrate([
      ['view.cache.dashboard.projects.42', [{ id: 'stale-project', name: 'Old name' }]],
    ]);

    cache.write('view.cache.dashboard.projects.42', [{ id: 'live-project', name: 'New name' }]);

    expect(cache.read<{ id: string; name: string }>('view.cache.dashboard.projects.42')).toEqual([
      { id: 'live-project', name: 'New name' },
    ]);
  });

  test('removes startup rows when the session ends so another user cannot see them', () => {
    const cache = new ViewCacheMemory();
    cache.hydrate([['view.cache.dashboard.projects.42', [{ id: 'private-project' }]]]);

    cache.clear();

    expect(cache.read('view.cache.dashboard.projects.42')).toBeNull();
  });
});
