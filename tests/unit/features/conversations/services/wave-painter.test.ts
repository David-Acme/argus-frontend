import { afterEach, describe, expect, test } from 'bun:test';
import type { SharedValue } from 'react-native-reanimated';
import type { LiveLevels } from '@/features/conversations/model/live-wave';
import { paintWave } from '@/features/conversations/services/wave-painter';

type Call = [string, ...number[]];

const frames: ((now: number) => void)[] = [];
const original = {
  request: globalThis.requestAnimationFrame,
  cancel: globalThis.cancelAnimationFrame,
};

const fakeContext = (calls: Call[]) =>
  ({
    setTransform: (...args: number[]) => calls.push(['setTransform', ...args]),
    clearRect: () => calls.push(['clearRect']),
    beginPath: () => calls.push(['beginPath']),
    roundRect: (x: number, y: number, w: number, h: number) =>
      calls.push(['roundRect', x, y, w, h]),
    fill: () => calls.push(['fill']),
    fillRect: (x: number, y: number, w: number, h: number) => calls.push(['fillRect', x, y, w, h]),
    fillStyle: '',
  }) as unknown as CanvasRenderingContext2D;

const liveOf = (levels: LiveLevels) =>
  ({ get: () => levels, set: () => undefined }) as unknown as SharedValue<LiveLevels>;

afterEach(() => {
  frames.length = 0;
  globalThis.requestAnimationFrame = original.request;
  globalThis.cancelAnimationFrame = original.cancel;
});

describe('the web live waveform', () => {
  test('one canvas draws every bar per display frame and stops when asked', () => {
    let cancelled = 0;
    globalThis.requestAnimationFrame = (run) => frames.push(run);
    globalThis.cancelAnimationFrame = () => {
      cancelled += 1;
    };
    const calls: Call[] = [];
    const stop = paintWave({
      context: fakeContext(calls),
      box: { width: 40, height: 28, pitch: 4 },
      ratio: 2,
      tint: '#836A3C',
      still: false,
      live: liveOf({ seq: 3, values: [0.2, 0.5, 1] }),
    });
    frames.shift()?.(1000);
    frames.shift()?.(1008);
    expect(calls.filter(([name]) => name === 'fill')).toHaveLength(2);
    expect(calls.filter(([name]) => name === 'roundRect')).toHaveLength(6);
    stop();
    expect(cancelled).toBe(1);
  });

  test('with reduced motion it draws one still line and runs no loop', () => {
    globalThis.requestAnimationFrame = (run) => frames.push(run);
    const calls: Call[] = [];
    paintWave({
      context: fakeContext(calls),
      box: { width: 40, height: 28, pitch: 4 },
      ratio: 1,
      tint: '#746D68',
      still: true,
      live: liveOf({ seq: 1, values: [1] }),
    });
    expect(frames).toHaveLength(0);
    expect(calls.filter(([name]) => name === 'fillRect')).toEqual([['fillRect', 0, 13, 40, 2]]);
  });
});
