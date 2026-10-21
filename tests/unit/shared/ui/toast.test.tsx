import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { isValidElement, type ReactElement } from 'react';
import './translation-stub';

const custom = mock((_jsx: unknown, _options: { id?: string; duration?: number }) => 'native-id');

mock.module('sonner-native', () => ({
  Toaster: () => null,
  toast: { custom, dismiss: () => undefined },
}));

const { ToastCard } = await import('@/shared/ui/toast/toast-card');
const { planToast, ERROR_TOAST_ID } = await import('@/shared/ui/toast/toast-policy');
const { toast, Toaster } = await import('@/shared/ui/toast/toaster');
const native = await import('@/shared/ui/toast/toaster.native');

describe('Toast', () => {
  test('undo carries Deshacer, error carries Reintentar, and both are polite status regions', () => {
    let actions = 0;
    const answer = () => {
      actions += 1;
    };
    render(
      <>
        <ToastCard kind="undo" title="Tarea hecha: Comprar cajas" onAction={answer} />
        <ToastCard
          kind="error"
          title="No se guardó"
          body="Revisa tu conexión."
          icon="wifioff"
          onAction={answer}
        />
        <ToastCard kind="success" title="Guardado" />
        <ToastCard kind="info" title="Te aviso a las 17:00" />
      </>
    );
    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.getByText('Revisa tu conexión.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(actions).toBe(2);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('undo lasts 5 s, errors 8 s under one id so a second replaces the first', () => {
    expect(planToast({ kind: 'undo', title: 'x', onUndo: () => undefined }).duration).toBe(5000);
    const error = planToast({ kind: 'error', title: 'x' });
    expect([error.duration, error.id, error.haptic]).toEqual([8000, ERROR_TOAST_ID, 'warning']);
    expect(planToast({ kind: 'info', title: 'x' }).id).toBeUndefined();
  });

  test('on the web a second error replaces the first and an action dismisses its toast', async () => {
    let undone = 0;
    render(<Toaster />);
    act(() => {
      toast.show({ kind: 'error', title: 'Primero', onRetry: () => undefined });
      toast.show({ kind: 'error', title: 'Segundo', onRetry: () => undefined });
    });
    expect(await screen.findByText('Segundo')).toBeDefined();
    expect(screen.queryByText('Primero')).toBeNull();
    act(() => {
      toast.show({
        kind: 'undo',
        title: 'Tarea hecha',
        onUndo: () => {
          undone += 1;
        },
      });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    expect(undone).toBe(1);
    act(() => toast.dismiss());
  });

  test('on the phone the card is a sonner-native custom toast with the error id', () => {
    native.toast.show({ kind: 'error', title: 'No se guardó', onRetry: () => undefined });
    const [jsx, options] = custom.mock.calls[0] ?? [];
    expect(isValidElement(jsx as ReactElement)).toBe(true);
    expect(options).toEqual({ id: ERROR_TOAST_ID, duration: 8000 });
    expect(native.Toaster()).toBeDefined();
  });
});
