import { beforeAll, describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { tokens } from '@/shared/theme/tokens';
import { calls, frameCallbacks, installNativeUiMocks, markupRenderer } from './native-ui-mocks';

installNativeUiMocks();

type Modules = {
  presence: typeof import('@/shared/ui/presence/presence');
  web: typeof import('@/shared/ui/presence/presence-canvas.web');
  canvas: typeof import('@/shared/ui/presence/presence-canvas');
  plan: typeof import('@/shared/ui/presence/plan');
};

let modules: Modules;
let renderToStaticMarkup: Awaited<ReturnType<typeof markupRenderer>>;

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
    climb: false,
    patience: 300,
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
  stillKey: 'idle',
};

beforeAll(async () => {
  renderToStaticMarkup = await markupRenderer();
  modules = {
    presence: await import('@/shared/ui/presence/presence'),
    web: await import('@/shared/ui/presence/presence-canvas.web'),
    canvas: await import('@/shared/ui/presence/presence-canvas'),
    plan: await import('@/shared/ui/presence/plan'),
  };
});

describe('Presence', () => {
  test('it is decorative unless it is given a label', () => {
    const quiet = renderToStaticMarkup(
      createElement(modules.presence.Presence, { state: 'idle', size: 66 })
    );
    expect(quiet).toContain('importantforaccessibility="no-hide-descendants"');
    expect(quiet).toContain('aria-hidden="true"');
    const named = renderToStaticMarkup(
      createElement(modules.presence.Presence, {
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
    renderToStaticMarkup(createElement(modules.presence.Presence, { state: 'speak', size: 300 }));
    const frame = frameCallbacks.at(-1);
    expect(frame).toBeDefined();
    for (let i = 1; i <= 4; i++) frame?.({ timestamp: 1000 + i * 17 });
    expect(calls.drawAtlas.length).toBe(4);
    expect((calls.drawAtlas[0]?.[2] as unknown[]).length).toBe(560 + 4);
  });

  test('the native renderer draws the low tier with half the particles', () => {
    frameCallbacks.length = 0;
    calls.drawAtlas.length = 0;
    const plan = modules.plan.planFor({ size: 300, tier: 'low', reduceMotion: false });
    renderToStaticMarkup(
      createElement(modules.canvas.PresenceCanvas, {
        ...canvasProps,
        plan,
        look: { ...canvasProps.look, size: 300 },
      })
    );
    frameCallbacks.at(-1)?.({ timestamp: 2000 });
    expect((calls.drawAtlas[0]?.[2] as unknown[]).length).toBe(280 + 4);
  });

  test('the web renderer is a plain canvas sized for the device pixels', () => {
    const html = renderToStaticMarkup(createElement(modules.web.PresenceCanvas, canvasProps));
    expect(html).toMatch(/<canvas width="\d+" height="\d+"/);
    expect(html).toContain('aria-hidden="true"');
  });
});
