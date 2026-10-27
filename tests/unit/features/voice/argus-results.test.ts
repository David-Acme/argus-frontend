import { describe, expect, test } from 'bun:test';
import type { ReminderResult } from '@/features/voice/model/argus-result';
import { ArgusResults } from '@/features/voice/services/results/argus-results';
import type { ResultFrameListener } from '@/features/voice/services/results/argus-results';

type Store = { results: ArgusResults; send: ResultFrameListener; tick: () => void };

function store(): Store {
  const listeners = new Set<ResultFrameListener>();
  let now = 100;
  const results = new ArgusResults({
    onFrame: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    now: () => now,
  });
  return {
    results,
    send: (payload) => listeners.forEach((listener) => listener(payload)),
    tick: () => (now += 10),
  };
}

const SHOW = { id: '1', name: 'app.show_camera' as const, arguments: { camera: 'Patio' } };

const offer = (id: string) => ({
  id,
  tool: 'memory.remind',
  ok: true,
  data: { title: 'Dentista', remindAt: 60, confirm: true },
});

describe('the results of this conversation', () => {
  test('a voice:result frame adds its card and tells the listeners', () => {
    const { results, send } = store();
    let told = 0;
    results.subscribe(() => (told += 1));
    send({
      id: '4',
      tool: 'memory.remind',
      ok: true,
      data: { title: 'Pagar el agua', remindAt: 50 },
    });
    expect(results.snapshot.map((result) => result.kind)).toEqual(['reminder']);
    expect(told).toBe(1);
  });

  test('the same frame from the socket and from the call is one card, told once', () => {
    const { results, send, tick } = store();
    let told = 0;
    results.subscribe(() => (told += 1));
    send(offer('5'));
    tick();
    send(offer('5'));
    expect(results.snapshot).toHaveLength(1);
    expect(results.snapshot[0]?.at).toBe(100);
    expect(told).toBe(1);
  });

  test('an action is recorded once, then settled with the camera the app opened', () => {
    const { results, tick } = store();
    results.recordAction(SHOW);
    tick();
    results.recordAction(SHOW);
    results.settleAction(SHOW, { outcome: { ok: true, detail: null }, cameraId: 'cam-2' });
    expect(results.snapshot).toEqual([
      { id: 'action:1', at: 100, status: 'done', kind: 'camera', cameraId: 'cam-2', name: 'Patio' },
    ]);
  });

  test('answering an offer closes its question until the backend settles it', () => {
    const { results, send } = store();
    send(offer('5'));
    const asking = results.snapshot[0] as ReminderResult;
    results.answerOffer(asking, 'yes');
    expect(results.snapshot[0]).toMatchObject({ asking: false, answer: 'yes', status: 'pending' });
    send({ id: '5', tool: 'memory.remind', ok: true, data: { title: 'Dentista', remindAt: 60 } });
    expect(results.snapshot[0]).toMatchObject({ asking: false, status: 'done' });
  });

  test('a no settles the card with the same id and keeps it', () => {
    const { results, send } = store();
    send(offer('6'));
    results.answerOffer(results.snapshot[0] as ReminderResult, 'no');
    send({ id: '6', tool: 'memory.remind', ok: false, data: {} });
    expect(results.snapshot).toHaveLength(1);
    expect(results.snapshot[0]).toMatchObject({ asking: false, status: 'failed' });
  });

  test('a card read back from the conversation can be answered too', () => {
    const { results } = store();
    const kept: ReminderResult = {
      id: 'result:7',
      at: 40,
      status: 'pending',
      kind: 'reminder',
      offerId: '7',
      asking: true,
      answer: null,
      title: 'Regar',
      remindAt: 60_000,
    };
    results.answerOffer(kept, 'no');
    expect(results.snapshot).toEqual([{ ...kept, asking: false, answer: 'no' }]);
  });

  test('a result that arrives before any screen reads the store is kept when it first binds', () => {
    const { results, send } = store();
    send({ id: '8', tool: 'memory.remind', ok: true, data: { title: 'Regar', remindAt: 60 } });
    results.bindUser('1');
    expect(results.snapshot).toHaveLength(1);
  });

  test('another account starts with no results', () => {
    const { results } = store();
    results.bindUser('1');
    results.recordAction(SHOW);
    results.bindUser('2');
    expect(results.snapshot).toEqual([]);
  });
});
