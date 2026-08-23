import { describe, expect, test } from 'bun:test';
import {
  buildViewCacheStorageKey,
  VIEW_CACHE_PAGE_SIZE,
} from '@/shared/constants/cache.constant';

describe('view cache storage key', () => {
  test('isolates a view page by signed-in user and scope', () => {
    expect(buildViewCacheStorageKey('17', 'camera.list', 'page.1')).toBe(
      'view.cache.v2.17.camera.list.page.1',
    );
  });

  test('keeps ordinary list pages bounded to forty rows', () => {
    expect(VIEW_CACHE_PAGE_SIZE).toBe(40);
  });
});
