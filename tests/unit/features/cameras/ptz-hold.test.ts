import { describe, expect, test } from 'bun:test';
import type { ICameraPtz } from '@/core/interfaces';
import { resolveCapabilities } from '@/features/cameras/model/camera-capabilities';
import {
  PTZ_HOLD_RENEW_MAX_MS,
  PTZ_HOLD_RENEW_MIN_MS,
  ptzHold,
  ptzHoldRenewMs,
  type PtzDirection,
} from '@/features/cameras/model/camera-ptz';
import { createPtzHold, type PtzRenewTimers } from '@/features/cameras/model/ptz-hold';

type Sent = { kind: 'start' | 'renew' | 'stop'; body: ICameraPtz };

type FakeInterval = { tick: () => void; ms: number; cancelled: boolean };

function fakeTimers() {
  const armed: FakeInterval[] = [];
  const timers: PtzRenewTimers = {
    every: (tick, ms) => {
      const entry: FakeInterval = { tick, ms, cancelled: false };
      armed.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  };
  const fire = () => {
    for (const entry of armed) if (!entry.cancelled) entry.tick();
  };
  return { armed, timers, fire };
}

const flush = () => new Promise<void>((done) => setTimeout(done, 0));

function harness() {
  const sent: Sent[] = [];
  const waiting: (() => void)[] = [];
  const clock = fakeTimers();
  const move = (kind: 'start' | 'renew') => (direction: PtzDirection) => {
    sent.push({ kind, body: ptzHold(direction) });
    return new Promise<void>((done) => {
      waiting.push(done);
    });
  };
  const hold = createPtzHold({
    start: move('start'),
    renew: move('renew'),
    stop: () => {
      sent.push({ kind: 'stop', body: { stop: true } });
    },
    timers: clock.timers,
  });
  const answer = async () => {
    for (const done of waiting.splice(0)) done();
    await flush();
  };
  return { sent, clock, hold, answer };
}

describe('createPtzHold', () => {
  test('a camera that brings holdRenewMs gets the same angle again every interval until the release stops it', async () => {
    const { sent, clock, hold, answer } = harness();
    const renewMs = ptzHoldRenewMs({ ptz: true, holdRenewMs: 1000 });
    expect(renewMs).toBe(1000);

    hold.begin('left', renewMs);
    expect(clock.armed.map((entry) => entry.ms)).toEqual([1000]);
    await answer();
    clock.fire();
    await answer();
    clock.fire();
    await answer();
    expect(sent).toEqual([
      { kind: 'start', body: { angle: 180 } },
      { kind: 'renew', body: { angle: 180 } },
      { kind: 'renew', body: { angle: 180 } },
    ]);

    hold.release();
    expect(sent.at(-1)).toEqual({ kind: 'stop', body: { stop: true } });
    expect(clock.armed[0]?.cancelled).toBe(true);
    expect(hold.renewing()).toBe(false);
    expect(hold.held()).toBeNull();
    clock.fire();
    await answer();
    expect(sent.filter((entry) => entry.kind === 'renew')).toHaveLength(2);
  });

  test('a camera without the field, as Tapo, gets one move and no renewal', async () => {
    const { sent, clock, hold, answer } = harness();
    const renewMs = ptzHoldRenewMs({ ptz: true, presets: true, catalogId: 'tapo-c225' });
    expect(renewMs).toBeNull();

    hold.begin('up', renewMs);
    expect(clock.armed).toHaveLength(0);
    expect(hold.renewing()).toBe(false);
    await answer();
    clock.fire();
    hold.release();
    expect(sent).toEqual([
      { kind: 'start', body: { angle: 90 } },
      { kind: 'stop', body: { stop: true } },
    ]);
  });

  test('a tick while the previous move is still in flight is skipped, so renewals never pile up', async () => {
    const { sent, clock, hold, answer } = harness();
    hold.begin('right', 1000);
    clock.fire();
    clock.fire();
    expect(sent.map((entry) => entry.kind)).toEqual(['start']);
    await answer();
    clock.fire();
    clock.fire();
    expect(sent.map((entry) => entry.kind)).toEqual(['start', 'renew']);
  });

  test('unmount cancels the renewal and reports the hold it cut, sending nothing itself', async () => {
    const { sent, clock, hold, answer } = harness();
    hold.begin('down', 1000);
    await answer();

    expect(hold.dispose()).toBe(true);
    expect(clock.armed[0]?.cancelled).toBe(true);
    expect(hold.held()).toBeNull();
    clock.fire();
    await answer();
    expect(sent).toEqual([{ kind: 'start', body: { angle: 270 } }]);
    expect(hold.dispose()).toBe(false);
  });

  test('leaving active ends the hold with a stop and renews no more; coming back to active sends nothing', async () => {
    const { sent, clock, hold, answer } = harness();
    hold.begin('right', 1000);
    await answer();

    hold.appState('active');
    expect(hold.renewing()).toBe(true);
    expect(hold.held()).toBe('right');
    hold.appState('background');
    expect(clock.armed[0]?.cancelled).toBe(true);
    expect(hold.held()).toBeNull();
    expect(sent).toEqual([
      { kind: 'start', body: { angle: 0 } },
      { kind: 'stop', body: { stop: true } },
    ]);

    hold.appState('active');
    expect(hold.renewing()).toBe(false);
    clock.fire();
    await answer();
    expect(sent).toHaveLength(2);
  });

  test('inactive counts as leaving active, for a renewing hold and for a hold without renewal', async () => {
    const { sent, clock, hold, answer } = harness();
    hold.begin('left', 1000);
    await answer();
    hold.appState('inactive');
    expect(clock.armed[0]?.cancelled).toBe(true);
    expect(hold.held()).toBeNull();

    hold.begin('up', null);
    await answer();
    hold.appState('inactive');
    hold.appState('background');
    expect(sent).toEqual([
      { kind: 'start', body: { angle: 180 } },
      { kind: 'stop', body: { stop: true } },
      { kind: 'start', body: { angle: 90 } },
      { kind: 'stop', body: { stop: true } },
    ]);
  });

  test('a release after the hold has ended sends nothing and does not throw, because the stop already went out', async () => {
    const { sent, hold, answer } = harness();
    hold.begin('down', 1000);
    await answer();
    hold.appState('background');
    hold.appState('active');

    expect(() => hold.release()).not.toThrow();
    expect(() => hold.release()).not.toThrow();
    expect(sent).toEqual([
      { kind: 'start', body: { angle: 270 } },
      { kind: 'stop', body: { stop: true } },
    ]);
    expect(hold.dispose()).toBe(false);
  });

  test('a new hold replaces the old one: its renewal is cancelled and the new angle is renewed', async () => {
    const { sent, clock, hold, answer } = harness();
    hold.begin('left', 1000);
    await answer();
    hold.begin('up', 500);
    expect(clock.armed[0]?.cancelled).toBe(true);
    expect(clock.armed[1]?.ms).toBe(500);
    await answer();
    clock.fire();
    expect(sent.at(-1)).toEqual({ kind: 'renew', body: { angle: 90 } });
  });

  test('a release without a hold sends nothing', () => {
    const { sent, hold } = harness();
    hold.release();
    expect(sent).toEqual([]);
  });
});

describe('ptzHoldRenewMs', () => {
  test('honours only a finite number of milliseconds between the floor and the ceiling', () => {
    expect(ptzHoldRenewMs(null)).toBeNull();
    expect(ptzHoldRenewMs({})).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: PTZ_HOLD_RENEW_MIN_MS })).toBe(PTZ_HOLD_RENEW_MIN_MS);
    expect(ptzHoldRenewMs({ holdRenewMs: PTZ_HOLD_RENEW_MAX_MS })).toBe(PTZ_HOLD_RENEW_MAX_MS);
    expect(ptzHoldRenewMs({ holdRenewMs: 999.6 })).toBe(1000);
    expect(ptzHoldRenewMs({ holdRenewMs: PTZ_HOLD_RENEW_MIN_MS - 1 })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: PTZ_HOLD_RENEW_MAX_MS + 1 })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: 0 })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: -1000 })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: Number.NaN })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: Number.POSITIVE_INFINITY })).toBeNull();
    expect(ptzHoldRenewMs({ holdRenewMs: '1000' as unknown as number })).toBeNull();
  });

  test('the remote holdRenewMs survives beside the synced flags', () => {
    const resolved = resolveCapabilities(['ptz', 'presets'], { holdRenewMs: 1000, catalogId: 'onvif-generic' });
    expect(resolved?.ptz).toBe(true);
    expect(ptzHoldRenewMs(resolved)).toBe(1000);
    expect(ptzHoldRenewMs(resolveCapabilities(['ptz'], null))).toBeNull();
  });
});
