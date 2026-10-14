import { describe, expect, mock, spyOn, test } from 'bun:test';
import type { NetProbeClock, NetRouteReadings } from '@/core/services/net/net-route-probe';
import type { NetPairedInstance, NetProbeOutcome, NetProbeReading, NetRouteChoice } from '@/core/types';

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async () => null,
    setStringAsync: async () => undefined,
    deleteAsync: async () => undefined,
    hasAsync: async () => false,
  },
}));

const { measureRoute, probeUrls, readingOf } = await import('@/core/services/net/net-route-probe');
const { chooseRoute } = await import('@/core/services/net/net-route-choice');
const { log } = await import('@/core/services/log');

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
  promise: Promise<NetProbeReading>;
  answer: (outcome?: NetProbeOutcome) => void;
  throwOut: () => void;
}

function pending(): Answer {
  const handlers = {
    answer: (_outcome: NetProbeOutcome): void => undefined,
    throwOut: (): void => undefined,
  };
  const promise = new Promise<NetProbeReading>((resolve, reject) => {
    handlers.answer = (outcome) => resolve({ outcome, address: '127.0.0.1:7044', fingerprint: '' });
    handlers.throwOut = () => reject(new Error('NETWORK_ERROR|the native probe failed'));
  });
  return {
    promise,
    answer: (outcome = 'reached') => handlers.answer(outcome),
    throwOut: () => handlers.throwOut(),
  };
}

function harness(target: NetPairedInstance = instance) {
  const clock = new FakeClock();
  const lan = pending();
  const relay = pending();
  const calls: { url: string; at: number }[] = [];
  const outcome: { choice: NetRouteChoice | null; readings: NetRouteReadings | null } = { choice: null, readings: null };
  const done = measureRoute(
    target,
    (url) => {
      calls.push({ url, at: clock.now });
      return url === LAN ? lan.promise : relay.promise;
    },
    { timeoutMs: 4000, headStartMs: 1500, clock }
  ).then((readings) => {
    outcome.readings = readings;
    outcome.choice = chooseRoute({ lan: readings.lan.outcome, relay: readings.relay.outcome });
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

  test('a native reply is read into its class, and an unknown class reads as connect', () => {
    expect(readingOf({ outcome: 'tls-peer-closed', address: '10.0.0.2:443', fingerprint: '' })).toEqual({
      outcome: 'tls-peer-closed',
      address: '10.0.0.2:443',
      fingerprint: '',
    });
    expect(readingOf({ outcome: 'sideways' }).outcome).toBe('connect');
  });

  test('an unknown native class is logged once per class, and still reads as connect', () => {
    const warn = spyOn(log, 'warn').mockImplementation(() => undefined);
    try {
      expect(readingOf({ outcome: 'probe-class-x' }).outcome).toBe('connect');
      readingOf({ outcome: 'probe-class-x' });
      expect(warn).toHaveBeenCalledTimes(1);
      readingOf({ outcome: 'probe-class-y' });
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  test('a LAN that answers within the head start never touches the relay', async () => {
    const h = harness();
    await h.clock.advance(1000);
    h.lan.answer();
    await h.clock.advance(5000);
    await h.done;

    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'home', relayRefused: false });
    expect(h.calls).toEqual([{ url: LAN, at: 0 }]);
  });

  test('a LAN that fails fast starts the relay at once', async () => {
    const h = harness();
    await h.clock.advance(10);
    h.lan.answer('connect');
    await h.clock.advance(0);

    expect(h.calls).toEqual([
      { url: LAN, at: 0 },
      { url: RELAY, at: 10 },
    ]);
    h.relay.answer();
    await h.clock.advance(0);
    await h.done;
    expect(h.outcome.choice).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });
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
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'home', relayRefused: false });
  });

  test('a native probe that never answers reads as connect once its backstop runs out', async () => {
    const h = harness();
    await h.clock.advance(1500);
    h.relay.answer();
    await h.clock.advance(3499);
    expect(h.outcome.choice).toBeNull();
    await h.clock.advance(1);
    await h.done;
    expect(h.outcome.readings?.lan.outcome).toBe('connect');
    expect(h.outcome.choice).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });
  });

  test('a native probe that throws reads as connect', async () => {
    const h = harness();
    h.lan.throwOut();
    await h.clock.advance(0);
    h.relay.answer('dns');
    await h.clock.advance(0);
    await h.done;
    expect(h.outcome.readings?.lan.outcome).toBe('connect');
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'remote-unavailable', relayRefused: false });
  });

  test('each class the relay names reaches the choice, with its address and fingerprint', async () => {
    const expected: Record<string, NetRouteChoice> = {
      dns: { mode: 'lan', status: 'remote-unavailable', relayRefused: false },
      connect: { mode: 'lan', status: 'remote-unavailable', relayRefused: false },
      'tls-peer-closed': { mode: 'lan', status: 'unreachable', relayRefused: false },
      pin: { mode: 'lan', status: null, relayRefused: true },
    };
    for (const [relayOutcome, choice] of Object.entries(expected)) {
      const h = harness();
      h.lan.answer('connect');
      await h.clock.advance(0);
      h.relay.answer(relayOutcome as NetProbeOutcome);
      await h.clock.advance(0);
      await h.done;
      expect([relayOutcome, h.outcome.choice]).toEqual([relayOutcome, choice]);
      expect(h.outcome.readings?.relay.address).toBe('127.0.0.1:7044');
    }
  });

  test('without a usable profile only the LAN is asked, and remote access is unavailable', async () => {
    const h = harness(withoutRemote);
    h.lan.answer('connect');
    await h.clock.advance(5000);
    await h.done;
    expect(h.calls).toEqual([{ url: LAN, at: 0 }]);
    expect(h.outcome.choice).toEqual({ mode: 'lan', status: 'remote-unavailable', relayRefused: false });
  });
});
