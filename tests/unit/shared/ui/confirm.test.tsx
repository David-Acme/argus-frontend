import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Alert } from 'react-native';
import { layout } from '@/shared/theme/tokens';
import './translation-stub';
import { setWindowSize } from './window-width';

const { ConfirmBox } = await import('@/shared/ui/confirm/confirm-box');
const { Confirm } = await import('@/shared/ui/confirm/confirm');
const { ConfirmDialog } = await import('@/shared/ui/confirm/confirm-dialog');
const { Confirm: NativeConfirm } = await import('@/shared/ui/confirm/confirm.native');
const { confirmForm } = await import('@/shared/ui/confirm/confirm-form');

function resize(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  globalThis.dispatchEvent(new Event('resize'));
}

const siren = {
  title: '¿Hacer sonar la sirena?',
  body: 'Sonará en Cocina durante 30 segundos.',
  confirmLabel: 'Hacer sonar',
};

describe('Confirm', () => {
  test('on a phone on its side the box stays inside the window and its body scrolls', () => {
    setWindowSize(740, 360);
    render(
      <ConfirmBox
        {...siren}
        cancelLabel="Cancelar"
        destructive={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    const box = screen.getByText(siren.title).closest('[style*="max-height"]') as HTMLElement;
    expect(box.style.maxHeight).toBe(`${360 - layout.gutterMedium * 2}px`);
    setWindowSize(360, 800);
  });

  test('the box names the act and the cancel, and each button answers once', () => {
    let confirmed = 0;
    let cancelled = 0;
    render(
      <ConfirmBox
        {...siren}
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          confirmed += 1;
        }}
        onCancel={() => {
          cancelled += 1;
        }}
      />
    );
    expect(screen.getByText(siren.title)).toBeDefined();
    expect(screen.getByText(siren.body)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Hacer sonar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect([confirmed, cancelled]).toEqual([1, 1]);
  });

  test('an open dialog is an alertdialog named by its title, and Esc means Cancelar', () => {
    let cancelled = 0;
    render(
      <Confirm
        open
        {...siren}
        variant="destructive"
        onConfirm={() => undefined}
        onCancel={() => {
          cancelled += 1;
        }}
      />
    );
    const dialog = screen.getByRole('alertdialog', { name: siren.title });
    expect(dialog).toBeDefined();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(cancelled).toBe(1);
  });

  test('an outside tap cancels a default confirmation and is ignored by a destructive one', () => {
    let cancelled = 0;
    const cancel = () => {
      cancelled += 1;
    };
    const { rerender } = render(
      <ConfirmDialog
        open
        {...siren}
        variant="destructive"
        onConfirm={() => undefined}
        onCancel={cancel}
      />
    );
    const scrim = () => {
      const node = screen.getByRole('alertdialog').parentElement?.firstElementChild;
      if (!node) throw new Error('the scrim is missing');
      return node;
    };
    fireEvent.click(scrim());
    expect(cancelled).toBe(0);
    rerender(<ConfirmDialog open {...siren} onConfirm={() => undefined} onCancel={cancel} />);
    fireEvent.click(scrim());
    expect(cancelled).toBe(1);
  });

  test('a closed dialog renders nothing', () => {
    render(
      <Confirm open={false} {...siren} onConfirm={() => undefined} onCancel={() => undefined} />
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('on a phone a destructive confirmation is the native alert and ignores outside taps', () => {
    const alert = mock((..._args: unknown[]) => undefined);
    Alert.alert = alert;
    resize(360);
    render(
      <NativeConfirm
        open
        {...siren}
        variant="destructive"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, body, buttons, options] = alert.mock.calls[0] ?? [];
    expect([title, body]).toEqual([siren.title, siren.body]);
    expect(buttons).toEqual([
      expect.objectContaining({ text: 'Cancelar', style: 'cancel' }),
      expect.objectContaining({ text: 'Hacer sonar', style: 'destructive' }),
    ]);
    expect(options).toEqual(expect.objectContaining({ cancelable: false }));
  });

  test('on a wide window the native confirmation is the dialog', () => {
    resize(1280);
    render(
      <NativeConfirm open {...siren} onConfirm={() => undefined} onCancel={() => undefined} />
    );
    expect(screen.getByRole('alertdialog', { name: siren.title })).toBeDefined();
    resize(0);
  });

  test('a destructive dialog confirms once however often its button is pressed', () => {
    let confirmed = 0;
    let cancelled = 0;
    render(
      <ConfirmDialog
        open
        {...siren}
        variant="destructive"
        onConfirm={() => {
          confirmed += 1;
        }}
        onCancel={() => {
          cancelled += 1;
        }}
      />
    );
    const confirm = screen.getByRole('button', { name: 'Hacer sonar' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect([confirmed, cancelled]).toEqual([1, 0]);
  });

  test('an asynchronous confirmation is busy until it settles and answers again on reopening', async () => {
    let confirmed = 0;
    let finish: () => void = () => undefined;
    const onConfirm = () => {
      confirmed += 1;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    };
    const { rerender } = render(
      <ConfirmDialog open {...siren} onConfirm={onConfirm} onCancel={() => undefined} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hacer sonar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hacer sonar' }));
    expect(confirmed).toBe(1);
    expect(screen.getByRole('button', { name: 'Hacer sonar' }).getAttribute('aria-busy')).toBe(
      'true'
    );
    await act(async () => {
      finish();
      await Promise.resolve();
    });
    rerender(
      <ConfirmDialog open={false} {...siren} onConfirm={onConfirm} onCancel={() => undefined} />
    );
    rerender(<ConfirmDialog open {...siren} onConfirm={onConfirm} onCancel={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hacer sonar' }));
    expect(confirmed).toBe(2);
  });

  test('a destructive confirmation on an Android phone is the dialog, so Back can cancel it', () => {
    const phone = { compact: true, android: true };
    expect(confirmForm({ ...phone, destructive: true })).toBe('dialog');
    expect(confirmForm({ ...phone, destructive: false })).toBe('alert');
    expect(confirmForm({ compact: true, destructive: true, android: false })).toBe('alert');
    expect(confirmForm({ compact: false, destructive: false, android: false })).toBe('dialog');
  });
});
