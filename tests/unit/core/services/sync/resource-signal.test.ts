import { describe, expect, test } from 'bun:test';
import { createReloadGate, createResourceSignal, matchesResourceMatch, readResourceNotice } from '@/core/services/sync/resource-signal';
import type { ResourceNotice } from '@/core/types';

const fakeClock = () => {
  const jobs = new Map<number, () => void>();
  let next = 1;
  return {
    clock: {
      setTimeout: (run: () => void) => {
        const handle = next;
        next += 1;
        jobs.set(handle, run);
        return handle as unknown as ReturnType<typeof setTimeout>;
      },
    },
    runAll: () => {
      const pending = [...jobs.values()];
      jobs.clear();
      for (const run of pending) run();
    },
    armed: () => jobs.size,
  };
};

const notice = (domain: ResourceNotice['domain'], scope: ResourceNotice['scope'], ids: number[] = []): ResourceNotice => ({
  domain,
  scope,
  ids,
});

describe('the resource signal', () => {
  test('a burst for one domain and scope is one notice, with the ids merged', () => {
    const { clock, runAll } = fakeClock();
    const signal = createResourceSignal(clock, 300);
    const seen: ResourceNotice[] = [];
    signal.onChanged((item) => seen.push(item));

    signal.changed(notice('guard', 'incidents', [1]));
    signal.changed(notice('guard', 'incidents', [2]));
    signal.changed(notice('guard', 'incidents', [1, 3]));

    expect(seen).toEqual([]);
    runAll();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.domain).toBe('guard');
    expect([...(seen[0]?.ids ?? [])].sort()).toEqual([1, 2, 3]);
  });

  test('different scopes and domains are separate notices, and a later burst arms again', () => {
    const { clock, runAll } = fakeClock();
    const signal = createResourceSignal(clock, 300);
    const seen: string[] = [];
    signal.onChanged((item) => seen.push(`${item.domain}:${item.scope}`));

    signal.changed(notice('guard', 'incidents'));
    signal.changed(notice('guard', 'episodes'));
    signal.changed(notice('camera', 'device'));
    runAll();
    expect(seen.sort()).toEqual(['camera:device', 'guard:episodes', 'guard:incidents']);

    signal.changed(notice('guard', 'incidents'));
    expect(seen).toHaveLength(3);
    runAll();
    expect(seen).toHaveLength(4);
  });

  test('an unsubscribed listener hears nothing, and a notice outlives no listener', () => {
    const { clock, runAll } = fakeClock();
    const signal = createResourceSignal(clock, 300);
    let calls = 0;
    const stop = signal.onChanged(() => {
      calls += 1;
    });

    signal.changed(notice('identity', 'visitors'));
    stop();
    runAll();
    expect(calls).toBe(0);
  });

  test('the reconnect signal reaches every listener that is subscribed', () => {
    const { clock } = fakeClock();
    const signal = createResourceSignal(clock, 300);
    let first = 0;
    let second = 0;
    signal.onReconnected(() => {
      first += 1;
    });
    const stop = signal.onReconnected(() => {
      second += 1;
    });

    signal.reconnected();
    stop();
    signal.reconnected();

    expect(first).toBe(2);
    expect(second).toBe(1);
  });
});

describe('the reload gate', () => {
  test('a reload asked for while one is in flight waits and runs exactly once after it', async () => {
    const released: (() => void)[] = [];
    let runs = 0;
    const reload = createReloadGate(
      () =>
        new Promise<void>((resolve) => {
          runs += 1;
          released.push(resolve);
        })
    );

    void reload();
    void reload();
    void reload();
    expect(runs).toBe(1);

    released[0]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toBe(2);

    released[1]?.();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toBe(2);
  });

  test('a reload after the gate settled runs at once', async () => {
    let runs = 0;
    const reload = createReloadGate(async () => {
      runs += 1;
    });

    await reload();
    await reload();

    expect(runs).toBe(2);
  });
});

describe('reading a resource notice', () => {
  test('a registered pair is read, ids filtered to positive integers', () => {
    expect(readResourceNotice({ domain: 'guard', scope: 'safety_pin' })).toEqual({
      domain: 'guard',
      scope: 'safety_pin',
      ids: [],
    });
    expect(readResourceNotice({ domain: 'camera', scope: 'device', ids: [1, 2.5, 0, -3, 'x'] })?.ids).toEqual([1]);
  });

  test('an unknown domain or scope, or a frame that is not an object, is refused', () => {
    expect(readResourceNotice({ domain: 'gate', scope: 'device' })).toBeNull();
    expect(readResourceNotice({ domain: 'camera', scope: 'guests' })).toBeNull();
    expect(readResourceNotice({ domain: 'camera' })).toBeNull();
    expect(readResourceNotice(null)).toBeNull();
    expect(readResourceNotice('camera')).toBeNull();
  });
});

describe('matching a resource notice', () => {
  const incidents: ResourceNotice = { domain: 'guard', scope: 'incidents', ids: [] };

  test('a scope-less match takes its whole domain and a scoped one takes only its own', () => {
    expect(matchesResourceMatch([{ domain: 'guard' }], incidents)).toBe(true);
    expect(matchesResourceMatch([{ domain: 'guard', scope: 'incidents' }], incidents)).toBe(true);
    expect(matchesResourceMatch([{ domain: 'guard', scope: 'environments' }], incidents)).toBe(false);
    expect(matchesResourceMatch([{ domain: 'camera' }], incidents)).toBe(false);
    expect(matchesResourceMatch([], incidents)).toBe(false);
  });

  test('a match that names an id takes only the notice that names it', () => {
    const pair = [{ domain: 'guard', scope: 'episodes', id: 12 }] as const;
    expect(matchesResourceMatch(pair, { domain: 'guard', scope: 'episodes', ids: [12] })).toBe(true);
    expect(matchesResourceMatch(pair, { domain: 'guard', scope: 'episodes', ids: [11, 12] })).toBe(
      true
    );
    expect(matchesResourceMatch(pair, { domain: 'guard', scope: 'episodes', ids: [11] })).toBe(
      false
    );
    expect(matchesResourceMatch(pair, { domain: 'guard', scope: 'environments', ids: [12] })).toBe(
      false
    );
  });

  test('a notice without ids reaches every match of its pair, ids or none', () => {
    const purge: ResourceNotice = { domain: 'guard', scope: 'episodes', ids: [] };
    expect(matchesResourceMatch([{ domain: 'guard', scope: 'episodes' }], purge)).toBe(true);
    expect(matchesResourceMatch([{ domain: 'guard', scope: 'episodes', id: 12 }], purge)).toBe(true);
  });
});
