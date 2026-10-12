import { describe, expect, test } from 'bun:test';
import { createResourceSignal } from '@/core/services/sync/resource-signal';
import type { ResourceNotice } from '@/core/types';

const guardSetTimeout = (): (() => void) => {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = function (this: unknown, run: () => void, ms?: number) {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    return real(run, ms);
  } as typeof globalThis.setTimeout;
  return () => {
    globalThis.setTimeout = real;
  };
};

describe('the production default clock', () => {
  test('a notice is delivered under a browser-like clock that enforces this', async () => {
    const restore = guardSetTimeout();
    try {
      const signal = createResourceSignal(undefined, 1);
      const seen: ResourceNotice[] = [];
      signal.onChanged((notice) => seen.push(notice));

      signal.changed({ domain: 'guard', scope: 'incidents', ids: [1] });
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      expect(seen).toEqual([{ domain: 'guard', scope: 'incidents', ids: [1] }]);
    } finally {
      restore();
    }
  });
});
