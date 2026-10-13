import { describe, expect, mock, test } from 'bun:test';
import type { NetProbeClock } from '@/core/services/net/net-route-probe';
import type { NetPairedInstance, NetRouteChoice } from '@/core/types';

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async () => null,
    setStringAsync: async () => undefined,
    deleteAsync: async () => undefined,
    hasAsync: async () => false,
  },
}));

const { measureRoute, probeUrls } = await import('@/core/services/net/net-route-probe');

const HOME = '0123456789abcdef0123456789abcdef';
const DOMAIN = 'argus-tunnel.lynk.page';
const LAN = 'https://argus.local:7044/pairing/status';
const RELAY = `https://identity--${HOME}.${DOMAIN}/pairing/status`;

const instance: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.1.20',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { pairing: 7044 },
  remote: { homeId: HOME, domain: DOMAIN },
};

const { remote: _remote, ...withoutRemote } = instance;

const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
};

class FakeClock implements NetProbeClock {
  now = 0;
  private readonly timers: { at: number; fire: () => void; live: boolean }[] = [];

  after(ms: number, fire: () => void): () => void {
    const timer = { at: this.now + ms, fire, live: true };
    this.timers.push(timer);
    return () => {
      timer.live = false;
    };
  }

  async advance(ms: number): Promise<void> {
    const target = this.now + ms;
    for (;;) {
      await settle();
      const due = this.timers.filter((timer) => timer.live && timer.at <= target).sort((a, b) => a.at - b.at);
      const next = due[0];
      if (!next) break;
      next.live = false;
      this.now = next.at;
      next.fire();
    }
    this.now = target;
    await settle();
  }
}

interface Answer {
  promise: Promise<void>;
  answer: () => void;
  refuse: () => void;
}

function pending(): Answer {
  const handlers = { answer: (): void => undefined, refuse: (): void => undefined };
  const promise = new Promise<void>((resolve, reject) => {
    handlers.answer = () => resolve();
    handlers.refuse = () => reject(new Error('NETWORK_ERROR|unreachable'));
  });
  return { promise, answer: () => handlers.answer(), refuse: () => handlers.refuse() };
}

function harness(target: NetPairedInstance = instance) {
  const clock = new FakeClock();
  const lan = pending();
  const relay = pending();
  const calls: { url: string; at: number }[] = [];
  const outcome: { choice: NetRouteChoice | null } = { choice: null };
  const done = measureRoute(
    target,
    (url) => {
      calls.push({ url, at: clock.now });
      return url === LAN ? lan.promise : relay.promise;
    },
    { timeoutMs: 4000, headStartMs: 1500, clock }
  ).then((choice) => {
    outcome.choice = choice;
  });
  return { clock, lan, relay, calls, done, outcome };
}

describe('the route probe', () => {
  test('asks the paired host on the LAN and the identity service by its device name', () => {
    expect(probeUrls(instance)).toEqual({ lan: LAN, relay: RELAY });
    expect(probeUrls({ ...instance, route: 'relay' })).toEqual({ lan: LAN, relay: RELAY });
    expect(probeUrls(withoutRemote)).toEqual({ lan: LAN, relay: null });
    expect(probeUrls({ ...instance, remote: { homeId: HOME.toUpperCase(), domain: DOMAIN } }).relay).toBeNull();
  });

  test('a LAN that answers within the head start never touches the relay', async () => {
    const h = harness();
    await h.clock.advance(1000);
    h.lan.answer();
    await h.clock.advance(5000);
    await h.done;

    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'home' });
    expect(h.calls).toEqual([{ url: LAN, at: 0 }]);
  });

  test('a LAN that fails fast starts the relay at once', async () => {
    const h = harness();
    await h.clock.advance(10);
    h.lan.refuse();
    await h.clock.advance(0);

    expect(h.calls).toEqual([
      { url: LAN, at: 0 },
      { url: RELAY, at: 10 },
    ]);
    h.relay.answer();
    await h.clock.advance(0);
    await h.done;
    expect(h.outcome.choice).toEqual({ mode: 'relay', status: 'cloud' });
  });

  test('a slow LAN lets the relay start when the head start ends, and still wins if it answers', async () => {
    const h = harness();
    await h.clock.advance(1499);
    expect(h.calls).toEqual([{ url: LAN, at: 0 }]);
    await h.clock.advance(1);
    expect(h.calls).toEqual([
      { url: LAN, at: 0 },
      { url: RELAY, at: 1500 },
    ]);

    h.relay.answer();
    await h.clock.advance(500);
    expect(h.outcome.choice).toBeNull();
    h.lan.answer();
    await h.clock.advance(0);
    await h.done;
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'home' });
  });

  test('a LAN that never answers times out, and then the relay decides', async () => {
    const h = harness();
    await h.clock.advance(1500);
    h.relay.answer();
    await h.clock.advance(2499);
    expect(h.outcome.choice).toBeNull();
    await h.clock.advance(1);
    await h.done;
    expect(h.outcome.choice).toEqual({ mode: 'relay', status: 'cloud' });
  });

  test('a home that answers neither way is unreachable, and the LAN stays the route', async () => {
    const h = harness();
    h.lan.refuse();
    await h.clock.advance(0);
    h.relay.refuse();
    await h.clock.advance(0);
    await h.done;
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'unreachable' });
  });

  test('without a usable profile only the LAN is asked', async () => {
    const h = harness(withoutRemote);
    h.lan.refuse();
    await h.clock.advance(5000);
    await h.done;
    expect(h.calls).toEqual([{ url: LAN, at: 0 }]);
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'unreachable' });
  });
});
