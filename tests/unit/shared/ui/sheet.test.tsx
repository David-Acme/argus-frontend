import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import type { SheetProps } from '@/shared/ui/sheet/types';
import './translation-stub';

const { SheetDialog } = await import('@/shared/ui/sheet/sheet-dialog');

type Log = string[];

function sheet(log: Log, overrides: Partial<SheetProps> = {}) {
  return (
    <SheetDialog
      open
      title="Nuevo evento"
      onClose={() => log.push('close')}
      actions={{ primary: { label: 'Guardar', onPress: () => void log.push('save') } }}
      {...overrides}>
      <Text>Notas</Text>
    </SheetDialog>
  );
}

const ctrlEnter = () => fireEvent.keyDown(globalThis.document, { key: 'Enter', ctrlKey: true });

describe('Sheet dialog dismissal (§5.7)', () => {
  test('the dialog is named by its title', () => {
    render(sheet([]));
    expect(screen.getByRole('dialog', { name: 'Nuevo evento' })).toBeDefined();
  });

  test('an untouched form closes at once on Esc and on ✕', () => {
    const log: Log = [];
    const { rerender } = render(sheet(log));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    rerender(sheet(log));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(log).toEqual(['close', 'close']);
  });

  test('an untouched form closes on a press outside it', async () => {
    const log: Log = [];
    render(sheet(log));
    await act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));
    const overlay = screen.getByRole('dialog').parentElement ?? globalThis.document.body;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    await act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));
    expect(log).toEqual(['close']);
  });

  test('a dirty form asks before it discards, and Ctrl+Enter does not save behind the question', () => {
    const log: Log = [];
    render(sheet(log, { dirty: 'Visita del técnico' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(
      screen.getByRole('alertdialog', { name: '¿Descartar «Visita del técnico»?' })
    ).toBeDefined();
    ctrlEnter();
    expect(log).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(log).toEqual(['close']);
  });

  test('Ctrl+Enter saves once while the save is in flight', async () => {
    const log: Log = [];
    let finish = () => undefined as void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const onPress = () => {
      log.push('save');
      return pending;
    };
    render(sheet(log, { actions: { primary: { label: 'Guardar', onPress } } }));
    ctrlEnter();
    ctrlEnter();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(log).toEqual(['save']);
    await act(async () => {
      finish();
      await pending;
    });
    ctrlEnter();
    expect(log).toEqual(['save', 'save']);
  });
});
