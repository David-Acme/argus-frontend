import { describe, expect, test } from 'bun:test';
import { ArgusResults } from '@/features/voice/services/results/argus-results';

type Frames = Map<string, (payload: unknown) => void>;

function store(): { results: ArgusResults; frames: Frames; tick: () => void } {
  const frames: Frames = new Map();
  let now = 100;
  const results = new ArgusResults({
    onType: (type, listener) => {
      frames.set(type, listener);
      return () => frames.delete(type);
    },
    now: () => now,
  });
  return { results, frames, tick: () => (now += 10) };
}

const SHOW = { id: '1', name: 'app.show_camera' as const, arguments: { camera: 'Patio' } };

describe('the results of this conversation', () => {
  test('a voice:result frame adds its card and tells the listeners', () => {
    const { results, frames } = store();
    let told = 0;
    results.subscribe(() => (told += 1));
    frames.get('voice:result')?.({
      id: 4,
      tool: 'memory.remind',
      ok: true,
      data: { title: 'Pagar el agua', remindAt: 50, confirm: true },
    });
    expect(results.snapshot.map((result) => result.kind)).toEqual(['reminder']);
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

  test('answering an offer closes its question', () => {
    const { results, frames } = store();
    frames.get('voice:result')?.({
      id: 5,
      tool: 'memory.remind',
      ok: true,
      data: { title: 'Dentista', remindAt: 60, confirm: true },
    });
    results.answerOffer('result:5', true);
    expect(results.snapshot[0]).toMatchObject({ asking: false, status: 'done' });
  });

  test('another account starts with no results', () => {
    const { results } = store();
    results.bindUser('1');
    results.recordAction(SHOW);
    results.bindUser('2');
    expect(results.snapshot).toEqual([]);
  });
});
