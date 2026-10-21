import { beforeAll, describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import {
  captured,
  installNativeUiMocks,
  markupRenderer,
} from '../../shared/native-ui/native-ui-mocks';

installNativeUiMocks();
Object.assign(globalThis, { __DEV__: true });

type Modules = {
  screen: typeof import('@/features/ui-lab/spikes-screen');
  sheet: typeof import('@/features/ui-lab/demos/sheet-demo');
  presence: typeof import('@/features/ui-lab/demos/presence-demo');
  field: typeof import('@/features/ui-lab/demos/demo-field');
  bench: typeof import('@/features/ui-lab/bench/presence-bench');
};

let modules: Modules;
let renderToStaticMarkup: Awaited<ReturnType<typeof markupRenderer>>;

beforeAll(async () => {
  renderToStaticMarkup = await markupRenderer();
  modules = {
    screen: await import('@/features/ui-lab/spikes-screen'),
    sheet: await import('@/features/ui-lab/demos/sheet-demo'),
    presence: await import('@/features/ui-lab/demos/presence-demo'),
    field: await import('@/features/ui-lab/demos/demo-field'),
    bench: await import('@/features/ui-lab/bench/presence-bench'),
  };
});

describe('ui-lab spikes', () => {
  test('the screen opens on the sheet demo, whose sheet starts closed and untouched', () => {
    const html = renderToStaticMarkup(createElement(modules.screen.SpikesScreen));
    expect(html).toContain('testid="sheet-demo"');
    expect(captured.TrueSheet?.dismissible).toBe(true);
    expect(html).toContain('Nuevo evento');
  });

  test('the sheet demo opens nothing until asked', () => {
    renderToStaticMarkup(createElement(modules.sheet.SheetDemo));
    expect(captured.TrueSheet?.detents).toEqual(['auto']);
  });

  test('the presence demo has the playground and the ten catalogue cells at 150, 28, 36 and 48', () => {
    const html = renderToStaticMarkup(createElement(modules.presence.PresenceDemo));
    expect(html.match(/<rn-skia-canvas/g)?.length).toBe(1 + 10 * 4);
    expect(html).toContain('testid="presence-state-panic"');
  });

  test('a demo field names its input by its label', () => {
    const html = renderToStaticMarkup(
      createElement(modules.field.DemoField, {
        label: 'Título',
        value: 'Visita',
        onChangeText: () => undefined,
      })
    );
    expect(html).toContain('accessibilitylabel="Título"');
  });

  test('the bench reads its configuration from the link', () => {
    const html = renderToStaticMarkup(
      createElement(modules.bench.PresenceBench, {
        params: { tier: 'low', size: '120', state: 'panic', event: 'notify' },
      })
    );
    expect(html).toContain('low 120 panic notify');
  });
});
