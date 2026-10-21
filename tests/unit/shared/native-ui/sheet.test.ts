import { beforeAll, describe, expect, mock, test } from 'bun:test';
import { createElement } from 'react';
import { tokens } from '@/shared/theme/tokens';
import { calls, captured, installNativeUiMocks, window, markupRenderer } from './native-ui-mocks';

installNativeUiMocks();

type Modules = {
  phone: typeof import('@/shared/ui/sheet/sheet-phone');
  dialog: typeof import('@/shared/ui/sheet/sheet-dialog');
  native: typeof import('@/shared/ui/sheet/sheet');
  parts: typeof import('@/shared/ui/sheet/sheet-parts');
  web: typeof import('@/shared/ui/sheet/sheet.web');
};

let modules: Modules;
let renderToStaticMarkup: Awaited<ReturnType<typeof markupRenderer>>;

beforeAll(async () => {
  renderToStaticMarkup = await markupRenderer();
  modules = {
    phone: await import('@/shared/ui/sheet/sheet-phone'),
    dialog: await import('@/shared/ui/sheet/sheet-dialog'),
    native: await import('@/shared/ui/sheet/sheet'),
    parts: await import('@/shared/ui/sheet/sheet-parts'),
    web: await import('@/shared/ui/sheet/sheet.web'),
  };
});

const base = {
  open: true,
  title: 'Nuevo evento',
  children: createElement('rn-field'),
  actions: {
    primary: { label: 'Guardar', onPress: () => undefined },
    more: { label: 'Más opciones', onPress: () => undefined },
  },
};

describe('Sheet on a phone', () => {
  test('a long form takes the ceiling, the scroll and the pinned footer of spec §5.9', () => {
    const html = renderToStaticMarkup(
      createElement(modules.phone.SheetPhone, { ...base, onClose: () => undefined, long: true })
    );
    const sheet = captured.TrueSheet ?? {};
    expect(sheet.detents).toEqual([0.6, 1]);
    expect(sheet.scrollable).toBe(true);
    expect(sheet.scrollableOptions).toEqual({ keyboardScrollOffset: 16 });
    expect(sheet.backgroundColor).toBe(tokens.color.dark.surface);
    expect(sheet.backgroundBlur).toBeUndefined();
    expect(sheet.maxContentHeight).toBe(window.height - 24 - 16);
    expect(sheet.footerOptions).toEqual({ keyboardOffset: -20 });
    expect(sheet.insetAdjustment).toBe('automatic');
    expect(sheet.dismissible).toBe(true);
    expect(html).toContain('Nuevo evento');
    expect(html).toContain('Guardar');
    expect(html).toContain('label="Cerrar"');
    expect(html).toContain('rn-gesture-root');
  });

  test('a short form sizes itself, and a dirty one blocks the drag and asks on Back', () => {
    calls.alerts.length = 0;
    renderToStaticMarkup(
      createElement(modules.phone.SheetPhone, {
        ...base,
        onClose: () => undefined,
        dirty: 'Pagar la luz',
      })
    );
    const sheet = captured.TrueSheet ?? {};
    expect(sheet.detents).toEqual(['auto']);
    expect(sheet.dismissible).toBe(false);
    expect((sheet.onBackPress as () => boolean)()).toBe(true);
    expect(calls.alerts[0]?.[0]).toBe('¿Descartar «Pagar la luz»?');
    expect(calls.alerts[0]?.[1]).toBe('Lo que escribiste se perderá.');
    expect(
      (calls.alerts[0]?.[2] as { text: string; style: string }[]).map((button) => [
        button.text,
        button.style,
      ])
    ).toEqual([
      ['Seguir editando', 'cancel'],
      ['Descartar', 'destructive'],
    ]);
  });

  test('the phone entry picks the native sheet at compact width', () => {
    window.width = 360;
    delete captured.TrueSheet;
    renderToStaticMarkup(
      createElement(modules.native.Sheet, { ...base, onClose: () => undefined })
    );
    expect(captured.TrueSheet).toBeDefined();
  });
});

describe('Sheet as a dialog', () => {
  test('Esc closes an untouched form at once and the footer carries the submit key', () => {
    const onClose = mock(() => undefined);
    const html = renderToStaticMarkup(createElement(modules.web.Sheet, { ...base, onClose }));
    expect(html).toContain('Ctrl ↵');
    expect(html).toContain('Más opciones');
    const event = { preventDefault: mock(() => undefined) };
    (captured.DialogContent?.onEscapeKeyDown as (event: unknown) => void)(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a dirty form does not close on Esc or an outside click', () => {
    const onClose = mock(() => undefined);
    renderToStaticMarkup(
      createElement(modules.dialog.SheetDialog, {
        ...base,
        onClose,
        dirty: 'Visita del técnico',
        long: true,
      })
    );
    (captured.DialogContent?.onEscapeKeyDown as (event: unknown) => void)({
      preventDefault: () => undefined,
    });
    (captured.DialogContent?.onInteractOutside as (event: unknown) => void)({
      preventDefault: () => undefined,
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Sheet parts', () => {
  test('the discard row names the form and offers both answers', () => {
    const html = renderToStaticMarkup(
      createElement(modules.parts.DiscardRow, {
        question: '¿Descartar «Visita del técnico»?',
        keep: { label: 'Seguir editando', onPress: () => undefined },
        discard: { label: 'Descartar', onPress: () => undefined },
        theme: tokens.color.light,
      })
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('Seguir editando');
    expect(html).toContain('Descartar');
  });
});
