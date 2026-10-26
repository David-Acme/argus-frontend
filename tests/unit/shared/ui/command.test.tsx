import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CommandGroup } from '@/shared/ui/command/command-types';
import './translation-stub';
import {
  Listbox as NativeListbox,
  optionId as nativeOptionId,
} from '@/shared/ui/command/listbox.native';
import { Listbox, optionId } from '@/shared/ui/command/listbox';

const { CommandPanel } = await import('@/shared/ui/command/command-panel');
const { CommandPalette, paletteWidth } = await import('@/shared/ui/command/command-palette');
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

  test('the query is a combobox whose active descendant is the selected option of its listbox', () => {
    render(<Harness log={[]} initialQuery="Pagar" />);
    const list = screen.getByRole('listbox');
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-controls')).toBe(list.id);
    const ask = screen.getByRole('option', { name: '«Pagar…» — pregúntale a Argus' });
    expect(input().getAttribute('aria-activedescendant')).toBe(ask.id);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const light = screen.getByRole('option', { name: 'Pagar la luz' });
    expect(input().getAttribute('aria-activedescendant')).toBe(light.id);
    expect(light.id).toContain('-option-');
    expect(list.id).not.toBe('');
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

  test('on pointer the palette is a named dialog that Esc and a click outside close', () => {
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
    const backdrop = dialog.previousElementSibling as HTMLElement;
    fireEvent.click(backdrop);
    expect(log).toEqual(['close', 'close']);
    fireEvent.click(screen.getByRole('option', { name: 'Pagar la luz' }));
    expect(log).toEqual(['close', 'close', 'light', 'close']);
  });

  test('Ctrl+K, ⌘K and / open the search, N opens the new-item actions, and a field keeps its keys', () => {
    const opened: string[] = [];
    function Hotkey() {
      useCommandHotkey((intent) => {
        opened.push(intent);
      });
      return <input aria-label="nota" />;
    }
    render(<Hotkey />);
    const field = screen.getByLabelText('nota');
    fireEvent.keyDown(globalThis.document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'K', metaKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'k' });
    fireEvent.keyDown(globalThis.document, { key: '/' });
    fireEvent.keyDown(globalThis.document, { key: 'n' });
    fireEvent.keyDown(globalThis.document, { key: 'N', shiftKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'n', altKey: true });
    fireEvent.keyDown(globalThis.document, { key: 'n', repeat: true });
    fireEvent.keyDown(field, { key: '/' });
    fireEvent.keyDown(field, { key: 'n' });
    fireEvent.keyDown(field, { key: 'k', ctrlKey: true });
    expect(opened).toEqual(['search', 'search', 'search', 'create', 'search']);
  });

  test('without an ask handler free text offers no Argus entry and Enter runs the first result', () => {
    const log: Log = [];
    render(
      <Command
        open
        onClose={() => log.push('close')}
        source={() => groups(log)}
        initialQuery="Pagar"
      />
    );
    const query = screen.getByRole('combobox', { name: 'Buscar o pedir a Argus' });
    expect((query as HTMLInputElement).value).toBe('Pagar');
    expect(screen.queryByRole('group', { name: 'Pedir a Argus' })).toBeNull();
    expect(screen.getByText('⇧ N')).toBeDefined();
    fireEvent.keyDown(query, { key: 'Enter' });
    expect(log).toEqual(['light', 'close']);
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
    expect(screen.queryByText('⇧ N')).toBeNull();
    native.useCommandHotkey(() => undefined);
  });
});

describe('CommandPalette', () => {
  test('the palette is 640 wide and keeps a 16 px gutter on a narrow window', () => {
    expect(paletteWidth(1280)).toBe(640);
    expect(paletteWidth(672)).toBe(640);
    expect(paletteWidth(360)).toBe(328);
  });
});

describe('Listbox', () => {
  test('the web listbox and the native list carry the id the combobox points to', () => {
    expect(optionId('list', 2)).toBe(nativeOptionId('list', 2));
    render(
      <>
        <Listbox id="web-list">
          <span>uno</span>
        </Listbox>
        <NativeListbox id="native-list">
          <span>dos</span>
        </NativeListbox>
      </>
    );
    expect(screen.getByRole('listbox').id).toBe('web-list');
    expect(globalThis.document.getElementById('native-list')?.textContent).toBe('dos');
  });
});
