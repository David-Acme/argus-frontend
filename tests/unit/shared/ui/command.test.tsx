import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CommandGroup } from '@/shared/ui/command/command-types';
import './translation-stub';

const { CommandPanel } = await import('@/shared/ui/command/command-panel');
const { CommandPalette } = await import('@/shared/ui/command/command-palette');
const { useCommand } = await import('@/shared/ui/command/use-command');
const { Command, useCommandHotkey } = await import('@/shared/ui/command/command');
const native = await import('@/shared/ui/command/command.native');

type Log = string[];

function groups(log: Log): readonly CommandGroup[] {
  return [
    {
      title: 'Agenda',
      items: [
        {
          id: 'light',
          label: 'Pagar la luz',
          meta: 'hoy 17:00',
          icon: 'bell',
          onRun: () => log.push('light'),
        },
      ],
    },
    {
      title: 'Acciones',
      items: [
        {
          id: 'night',
          label: 'Poner modo Noche',
          icon: 'moon',
          shortcut: '⇧ N',
          onRun: () => log.push('night'),
        },
      ],
    },
  ];
}

type HarnessProps = { log: Log; initialQuery?: string };

function Harness({ log, initialQuery }: HarnessProps) {
  const state = useCommand({
    source: () => groups(log),
    onAsk: (query) => log.push(`ask:${query}`),
    onClose: () => log.push('close'),
    initialQuery,
  });
  return (
    <CommandPalette>
      <CommandPanel state={state} hints />
    </CommandPalette>
  );
}

const input = () => screen.getByLabelText('Buscar o pedir a Argus');

describe('Command', () => {
  test('free text puts «pregúntale a Argus» first and Enter asks Argus, then closes', () => {
    const log: Log = [];
    render(<Harness log={log} initialQuery="Pagar" />);
    const ask = screen.getByRole('option', { name: '«Pagar…» — pregúntale a Argus' });
    expect(ask.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('group', { name: 'Agenda' })).toBeDefined();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(log).toEqual(['ask:Pagar', 'close']);
  });

  test('↑↓ move the selection, wrapping, and Enter runs the selected result', () => {
    const log: Log = [];
    render(<Harness log={log} initialQuery="Pagar" />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const night = screen.getByRole('option', { name: 'Poner modo Noche' });
    expect(night.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(log).toEqual(['night', 'close']);
  });

  test('without a query there is no ask entry and a click runs a result', () => {
    const log: Log = [];
    render(<Harness log={log} />);
    expect(screen.queryByRole('group', { name: 'Pedir a Argus' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Pagar la luz' }));
    expect(log).toEqual(['light', 'close']);
  });

  test('on pointer the palette is a named dialog that Esc closes', () => {
    const log: Log = [];
    render(
      <Command
        open
        onClose={() => log.push('close')}
        source={() => groups(log)}
        onAsk={() => undefined}
      />
    );
    const dialog = screen.getByRole('dialog', { name: 'Buscar o pedir a Argus' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(log).toEqual(['close']);
  });

  test('Ctrl+K and ⌘K open the palette', () => {
    let opened = 0;
    function Hotkey() {
      useCommandHotkey(() => {
        opened += 1;
      });
      return null;
    }
    render(<Hotkey />);
    fireEvent.keyDown(globalThis.document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'K', metaKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'k' });
    expect(opened).toBe(2);
  });

  test('on touch the palette is the sheet with the same results', () => {
    const log: Log = [];
    const { rerender } = render(
      <native.Command
        open={false}
        onClose={() => undefined}
        source={() => groups(log)}
        onAsk={() => undefined}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <native.Command
        open
        onClose={() => undefined}
        source={() => groups(log)}
        onAsk={() => undefined}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Buscar o pedir a Argus' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Pagar la luz' })).toBeDefined();
    native.useCommandHotkey(() => undefined);
  });
});
