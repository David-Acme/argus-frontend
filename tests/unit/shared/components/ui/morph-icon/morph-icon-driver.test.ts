import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Plus from 'lucide/dist/esm/icons/plus.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';
import { canonicalD } from 'morphicons/dom';
import { createMorphDriver } from '@/shared/components/ui/morph-icon/morph-icon-driver';

const pendingFrames: ((time: number) => void)[] = [];
let frameId = 0;

const plusD = canonicalD(Plus);
const xD = canonicalD(X);

beforeEach(() => {
  pendingFrames.length = 0;
  frameId = 0;
  Object.assign(globalThis, {
    requestAnimationFrame: (callback: (time: number) => void) => {
      pendingFrames.push(callback);
      frameId += 1;
      return frameId;
    },
    cancelAnimationFrame: () => {},
    matchMedia: (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query }),
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
  Reflect.deleteProperty(globalThis, 'cancelAnimationFrame');
  Reflect.deleteProperty(globalThis, 'matchMedia');
});

function pump(count: number, step: number) {
  for (let index = 1; index <= count; index += 1) {
    const due = pendingFrames.splice(0);
    if (due.length === 0) return;
    for (const callback of due) callback(index * step);
  }
}

function recordingDriver(reducedMotion: 'never' | 'user' | 'always') {
  const painted: string[] = [];
  const driver = createMorphDriver({
    icon: Plus,
    reducedMotion,
    onPath: (d) => painted.push(d),
  });
  return { painted, driver };
}

describe('createMorphDriver', () => {
  test('paints every morph frame into the path callback and settles on the target glyph', () => {
    const { painted, driver } = recordingDriver('never');
    expect(painted).toEqual([]);

    driver.morphTo(X, 'smooth');
    pump(30, 16.7);
    expect(pendingFrames.length).toBeGreaterThan(0);
    pump(150, 16.7);

    expect(painted.length).toBeGreaterThan(10);
    expect(new Set(painted).size).toBeGreaterThan(10);
    expect(painted[0]).not.toBe(xD);
    expect(painted.at(-1)).toBe(xD);
    expect(pendingFrames.length).toBe(0);
    const settled = painted.length;
    pump(60, 16.7);
    expect(painted.length).toBe(settled);
    driver.destroy();
  });

  test('reduced motion snaps to the glyph with a single paint', () => {
    const { painted, driver } = recordingDriver('user');

    driver.morphTo(X);
    expect(painted).toEqual([xD]);
    pump(60, 16.7);
    expect(painted).toEqual([xD]);

    driver.reduceMotion('never');
    driver.morphTo(Plus);
    pump(180, 16.7);
    expect(painted.length).toBeGreaterThan(2);
    expect(painted.at(-1)).toBe(plusD);
    driver.destroy();
  });

  test('set jumps to the glyph and cancels the flight in progress', () => {
    const { painted, driver } = recordingDriver('never');

    driver.morphTo(X, 'smooth');
    pump(30, 16.7);
    const midFlight = painted.length;
    expect(midFlight).toBeGreaterThan(1);

    driver.set(Plus);
    expect(painted.at(-1)).toBe(plusD);
    const settled = painted.length;
    pump(60, 16.7);
    expect(painted.length).toBe(settled);
    driver.destroy();
  });

  test('a morph starts from the glyph already painted when the target is returned to', () => {
    const { painted, driver } = recordingDriver('never');

    driver.morphTo(X, 'smooth');
    pump(180, 16.7);
    driver.morphTo(Plus, 'smooth');
    pump(180, 16.7);

    expect(painted.at(-1)).toBe(plusD);
    expect(painted.filter((d) => d === xD).length).toBe(1);
    driver.destroy();
  });

  test('the web wrapper renders the path from React state, never through the library setter', () => {
    const source = readFileSync(
      join(import.meta.dir, '../../../../../../src/shared/components/ui/morph-icon/morph-icon.web.tsx'),
      'utf8'
    );
    expect(source).toContain("from './morph-icon-driver'");
    expect(source).toContain('d={path}');
    expect(source).not.toContain('setNativeProps');
  });
});
