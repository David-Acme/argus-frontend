import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import type { MenuItems } from '@/shared/ui/menu/menu-types';
import './translation-stub';

const { MenuPreview } = await import('@/shared/ui/menu/menu-row');
const { Menu } = await import('@/shared/ui/menu/menu');
const { Menu: NativeMenu } = await import('@/shared/ui/menu/menu.native');
const { opensContextMenu } = await import('@/shared/ui/menu/menu-keys');

function items(log: string[]): MenuItems {
  return [
    { label: 'Marcar como hecho', icon: 'check', onPress: () => log.push('done') },
    { label: 'Borrar', icon: 'x', destructive: true, onPress: () => log.push('erase') },
  ];
}

describe('Menu', () => {
  test('the preview lists every item as a named menu item', () => {
    render(<MenuPreview items={items([])} />);
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getAllByRole('menuitem').map((node) => node.getAttribute('aria-label'))).toEqual([
      'Marcar como hecho',
      'Borrar',
    ]);
  });

  test('on pointer the trigger is named and opens a dropdown whose item runs once', async () => {
    const log: string[] = [];
    render(<Menu label="Opciones de Pagar la luz" items={items(log)} />);
    const trigger = screen.getByRole('button', { name: 'Opciones de Pagar la luz' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Borrar' }));
    expect(log).toEqual(['erase']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a right click on the row opens its context menu', async () => {
    const log: string[] = [];
    render(
      <Menu context label="Pagar la luz" items={items(log)}>
        <Text>Pagar la luz</Text>
      </Menu>
    );
    fireEvent.contextMenu(screen.getByText('Pagar la luz'));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Marcar como hecho', hidden: true })
    );
    expect(log).toEqual(['done']);
  });

  test('the context-menu key and Shift+F10 open a context menu, and nothing else does', () => {
    expect(opensContextMenu({ key: 'ContextMenu', shiftKey: false })).toBe(true);
    expect(opensContextMenu({ key: 'F10', shiftKey: true })).toBe(true);
    expect(opensContextMenu({ key: 'F10', shiftKey: false })).toBe(false);
    expect(opensContextMenu({ key: 'Enter', shiftKey: true })).toBe(false);
  });

  test('from the keyboard, Shift+F10 on the focused row opens its context menu', async () => {
    const log: string[] = [];
    render(
      <Menu context label="Pagar la luz" items={items(log)}>
        <button type="button">Pagar la luz</button>
      </Menu>
    );
    const row = screen.getByRole('button', { name: 'Pagar la luz' });
    row.focus();
    fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Borrar', hidden: true }));
    expect(log).toEqual(['erase']);
  });

  test('on touch the trigger opens the sheet list, and a row closes it before it runs', () => {
    const log: string[] = [];
    render(<NativeMenu label="Opciones" items={items(log)} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Opciones' }));
    expect(screen.getByRole('dialog', { name: 'Opciones' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(log).toEqual(['erase']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('on touch a context menu wraps its row and keeps the sheet closed until a long press', () => {
    render(
      <NativeMenu context label="Pagar la luz" items={items([])}>
        <Text>Pagar la luz</Text>
      </NativeMenu>
    );
    expect(screen.getByText('Pagar la luz')).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
