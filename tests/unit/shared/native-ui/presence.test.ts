import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { tokens } from '@/shared/theme/tokens';
import {
  calls,
  frameCallbacks,
  installNativeUiMocks,
  renderToStaticMarkup,
} from './native-ui-mocks';

installNativeUiMocks();

const { Presence } = await import('@/shared/ui/presence/presence');
const { PresenceCanvas: WebPresenceCanvas } =
  await import('@/shared/ui/presence/presence-canvas.web');
const { PresenceCanvas } = await import('@/shared/ui/presence/presence-canvas');
const { planFor } = await import('@/shared/ui/presence/plan');
const { draw, prepare, release } = await import('@/shared/ui/presence/skia-runtime');
const { stepFrame } = await import('@/shared/ui/presence/frame-loop');

const canvasProps = {
  plan: {
    tier: 'mid' as const,
    size: 120,
    count: 320,
    trails: true,
    activeFps: 60,
    restFps: 30,
    still: false,
    leanWhileScrolling: true,
    watch: false,
    climbWork: 0,
    patience: 3,
  },
  look: {
    size: 120,
    palette: tokens.illustration.estela.dark,
    dark: true,
    activeFps: 30,
    restFps: 30,
    leanWhileScrolling: false,
  },
  live: {
    input: {
      get: () => ({
        state: 'idle',
        resting: true,
        intensity: 0.5,
        targetX: 0.3,
        targetY: 0,
        eventName: null,
        eventId: 0,
        active: true,
      }),
    } as never,
    level: undefined,
    scroll: undefined,
    lean: { get: () => [0, 0] } as never,
  },
  seed: 9,
  active: true,
  still: {
    state: 'idle',
    resting: true,
    intensity: 0.5,
    targetX: 0.3,
    targetY: 0,
    eventName: null,
    eventId: 0,
  },
} as const;

const activeInput = {
  get: () => ({
    state: 'listen',
    resting: false,
    intensity: 0.5,
    targetX: 0.3,
    targetY: 0,
    eventName: null,
    eventId: 0,
    active: true,
  }),
} as never;

describe('Presence', () => {
  test('it is decorative unless it is given a label', () => {
    const quiet = renderToStaticMarkup(createElement(Presence, { state: 'idle', size: 66 }));
    expect(quiet).toContain('importantforaccessibility="no-hide-descendants"');
    expect(quiet).toContain('aria-hidden="true"');
    const named = renderToStaticMarkup(
      createElement(Presence, {
        state: 'look',
        size: 66,
        accessibilityLabel: 'Argus mira',
      })
    );
    expect(named).toContain('accessibilitylabel="Argus mira"');
    expect(named).toContain('accessibilityrole="image"');
  });

  test('the native renderer draws every particle of a frame in one atlas call', () => {
    frameCallbacks.length = 0;
    calls.drawAtlas.length = 0;
    renderToStaticMarkup(createElement(Presence, { state: 'speak', size: 300 }));
    const frame = frameCallbacks.at(-1);
    expect(frame).toBeDefined();
    for (let i = 1; i <= 4; i++) frame?.({ timestamp: 1000 + i * 17 });
    expect(calls.drawAtlas.length).toBe(4);
    expect((calls.drawAtlas[0]?.[2] as unknown[]).length).toBe(560 + 4);
  });

  test('the native renderer draws the low tier with half the particles', () => {
    frameCallbacks.length = 0;
    calls.drawAtlas.length = 0;
    const plan = planFor({ size: 300, tier: 'low', reduceMotion: false });
    renderToStaticMarkup(
      createElement(PresenceCanvas, {
        ...canvasProps,
        plan,
        look: { ...canvasProps.look, size: 300 },
      })
    );
    frameCallbacks.at(-1)?.({ timestamp: 2000 });
    expect((calls.drawAtlas[0]?.[2] as unknown[]).length).toBe(280 + 4);
  });

  test('the canvas tells the event end to the handler it was given', () => {
    frameCallbacks.length = 0;
    const ended: string[] = [];
    const input = {
      get: () => ({
        ...(canvasProps.live.input as { get: () => object }).get(),
        eventName: 'notify',
        eventId: 1,
      }),
    } as never;
    renderToStaticMarkup(
      createElement(PresenceCanvas, {
        ...canvasProps,
        live: { ...canvasProps.live, input },
        onEventEnd: (name) => ended.push(name),
      })
    );
    const frame = frameCallbacks.at(-1);
    for (let i = 1; i <= 90; i++) frame?.({ timestamp: 1000 + i * 17 });
    expect(ended).toEqual(['notify']);
  });

  test('a scene that is replaced or released frees its Skia objects but not the image on screen', () => {
    calls.disposed.length = 0;
    const look = { ...canvasProps.look, size: 120 };
    const spec = { count: 320, seed: 9, ratio: 2 };
    const first = prepare(null, { look, spec, shown: null });
    expect(first).not.toBeNull();
    if (!first) return;
    const frame = { state: 'idle', t: 1, size: 120, palette: look.palette, dark: true } as const;
    const shown = draw(first, { ...frame, stepped: true, drawn: 3 }, 0.2);
    Object.assign(shown, { dispose: () => calls.disposed.push('shown') });
    draw(first, { ...frame, stepped: true, drawn: 3 }, 0.2);
    expect(prepare(first, { look, spec, shown })).toBe(first);
    expect(calls.disposed).toEqual([]);
    const second = prepare(first, {
      look: { ...look, size: 300 },
      spec: { ...spec, count: 560 },
      shown,
    });
    expect(second?.driver).toBe(first.driver);
    expect(second?.driver.engine.particles.length).toBe(560);
    expect(calls.disposed.filter((name) => name === 'surface').length).toBe(1);
    expect(calls.disposed.filter((name) => name.startsWith('image')).length).toBe(2);
    expect(calls.disposed).not.toContain('shown');
    release(second, null);
    expect(calls.disposed.filter((name) => name === 'surface').length).toBe(2);
  });

  test('at 60 fps on a 120 Hz screen the skipped vsync paints ahead and the drawn one only presents', () => {
    calls.drawAtlas.length = 0;
    const look = { ...canvasProps.look, size: 300, activeFps: 60, restFps: 30 };
    const live = { ...canvasProps.live, input: activeInput };
    const runtime = prepare(null, {
      look,
      spec: { count: 560, seed: 9, ratio: 2 },
      shown: null,
    });
    if (!runtime) throw new Error('no runtime');
    const drawn: (number | null)[] = [];
    for (let i = 0; i <= 24; i++) {
      const job = { now: 1 + i / 120, since: 1 / 120, live, look, fade: 0.17 };
      const out = stepFrame(runtime, job);
      drawn.push(out ? i : null);
      if (i > 2 && !out) expect(runtime.ahead).not.toBeNull();
    }
    const frames = drawn.filter((i) => i !== null);
    expect(frames.length).toBeGreaterThanOrEqual(12);
    expect(frames.length).toBeLessThanOrEqual(13);
    expect(calls.drawAtlas.length).toBe(frames.length);
  });

  test('the web renderer is a plain canvas sized for the device pixels', () => {
    const html = renderToStaticMarkup(createElement(WebPresenceCanvas, canvasProps));
    expect(html).toMatch(/<canvas width="\d+" height="\d+"/);
    expect(html).toContain('aria-hidden="true"');
  });
});
