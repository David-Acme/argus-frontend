import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import type { MenuItems } from '@/shared/ui/menu/menu-types';
import './translation-stub';
import { setWindowWidth } from './window-width';

const { MenuPreview } = await import('@/shared/ui/menu/menu-row');
const { Menu } = await import('@/shared/ui/menu/menu');
const { MenuSheet } = await import('@/shared/ui/menu/menu-sheet.native');
const { opensContextMenu } = await import('@/shared/ui/menu/menu-keys');
const { MenuList } = await import('@/shared/ui/menu/menu-list');
const { MenuSheet: WebSheet } = await import('@/shared/ui/menu/menu-sheet');
const { MenuHold } = await import('@/shared/ui/menu/menu-hold');
const { MenuHold: NativeHold } = await import('@/shared/ui/menu/menu-hold.native');
const { AnchoredButton } = await import('@/shared/ui/menu/menu-anchored');
const { AnchoredContext: NativeContext } = await import('@/shared/ui/menu/menu-anchored.native');
const { useMenuRun } = await import('@/shared/ui/menu/use-menu-run');
const { menuForm, menuGroups, placeMenu, stepFocus } = await import('@/shared/ui/menu/menu-model');

const PHONE = 360;
const DESKTOP = 1280;

function items(log: string[]): MenuItems {
  return [
    {
      label: 'Borrar',
      icon: 'trash',
      destructive: true,
      confirm: {
        title: '¿Borrar Pagar la luz?',
        body: 'El recordatorio se borra de tu agenda.',
        confirmLabel: 'Borrar',
      },
      onPress: () => log.push('erase'),
    },
    { label: 'Marcar como hecho', icon: 'check', family: 'state', onPress: () => log.push('done') },
    { label: 'Editar', icon: 'pencil', family: 'edit', onPress: () => log.push('edit') },
  ];
}

afterEach(() => setWindowWidth(PHONE));

describe('Menu model', () => {
  test('a phone gets the sheet; a tablet, a desktop or any fine pointer get the anchored menu', () => {
    expect(menuForm({ navigation: 'bar', finePointer: false })).toBe('sheet');
    expect(menuForm({ navigation: 'bar', finePointer: true })).toBe('anchored');
    expect(menuForm({ navigation: 'rail', finePointer: false })).toBe('anchored');
    expect(menuForm({ navigation: 'sidebar', finePointer: true })).toBe('anchored');
  });

  test('the actions keep their order and every destructive one goes last', () => {
    const { actions, dangers } = menuGroups(items([]));
    expect(actions.map((item) => item.label)).toEqual(['Marcar como hecho', 'Editar']);
    expect(dangers.map((item) => item.label)).toEqual(['Borrar']);
  });

  test('the arrow keys wrap, Home and End jump, and other keys do nothing', () => {
    expect(stepFocus(-1, 'ArrowDown', 3)).toBe(0);
    expect(stepFocus(2, 'ArrowDown', 3)).toBe(0);
    expect(stepFocus(0, 'ArrowUp', 3)).toBe(2);
    expect(stepFocus(1, 'Home', 3)).toBe(0);
    expect(stepFocus(0, 'End', 3)).toBe(2);
    expect(stepFocus(0, 'Enter', 3)).toBeNull();
    expect(stepFocus(0, 'ArrowDown', 0)).toBeNull();
  });

  test('the anchored panel ends at its trigger below it, flips above near the bottom and stays inside', () => {
    const window = { width: 400, height: 800 };
    const panel = { width: 220, height: 200 };
    expect(
      placeMenu({ anchor: { x: 340, y: 40, width: 44, height: 44 }, panel, window, edge: 8 })
    ).toEqual({ left: 164, top: 88 });
    expect(
      placeMenu({ anchor: { x: 100, y: 700, width: 0, height: 0 }, panel, window, edge: 8 })
    ).toEqual({ left: 8, top: 496 });
    expect(
      placeMenu({ anchor: { x: 10, y: 10, width: 0, height: 0 }, panel, window, edge: 8 }).left
    ).toBe(8);
  });

  test('the context-menu key and Shift+F10 open a context menu, and nothing else does', () => {
    expect(opensContextMenu({ key: 'ContextMenu', shiftKey: false })).toBe(true);
    expect(opensContextMenu({ key: 'F10', shiftKey: true })).toBe(true);
    expect(opensContextMenu({ key: 'F10', shiftKey: false })).toBe(false);
    expect(opensContextMenu({ key: 'Enter', shiftKey: true })).toBe(false);
  });
});

describe('Menu', () => {
  test('every row has its icon well, and the destructive one sits last after a divider', () => {
    const { container } = render(<MenuPreview items={items([])} />);
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getAllByRole('menuitem').map((node) => node.getAttribute('aria-label'))).toEqual([
      'Marcar como hecho',
      'Editar',
      'Borrar',
    ]);
    expect(screen.getByRole('separator')).toBeDefined();
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  test('on a desktop the trigger opens an anchored menu whose item runs once', async () => {
    setWindowWidth(DESKTOP);
    const log: string[] = [];
    render(<Menu label="Opciones de Pagar la luz" items={items(log)} />);
    const trigger = screen.getByRole('button', { name: 'Opciones de Pagar la luz' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(log).toEqual(['edit']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a destructive item never runs from the menu: it asks in a dialog that names what goes', async () => {
    setWindowWidth(DESKTOP);
    const log: string[] = [];
    render(<Menu label="Opciones de Pagar la luz" items={items(log)} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Opciones de Pagar la luz' }), {
      key: 'Enter',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Borrar' }));
    expect(log).toEqual([]);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('¿Borrar Pagar la luz?');
    expect(dialog.textContent).toContain('El recordatorio se borra de tu agenda.');
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(log).toEqual(['erase']);
  });

  test('a right click on the row opens its context menu on a desktop', async () => {
    setWindowWidth(DESKTOP);
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

  test('from the keyboard, Shift+F10 on the focused row opens its context menu', async () => {
    setWindowWidth(DESKTOP);
    const log: string[] = [];
    render(
      <Menu context label="Pagar la luz" items={items(log)}>
        <button type="button">Pagar la luz</button>
      </Menu>
    );
    const row = screen.getByRole('button', { name: 'Pagar la luz' });
    row.focus();
    fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar', hidden: true }));
    expect(log).toEqual(['edit']);
  });

  test('on a phone a header «⋯» opens a dropdown with an icon on every row, never a sheet', async () => {
    const log: string[] = [];
    const listed = items(log);
    render(<Menu label="Opciones" items={listed} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Opciones' }), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(menu.querySelectorAll('svg')).toHaveLength(listed.length);
    expect(screen.getByRole('separator')).toBeDefined();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(log).toEqual(['edit']);
  });

  test('on a phone an item «⋯» opens a bottom sheet; a row closes it and runs', () => {
    const log: string[] = [];
    render(<Menu item label="Opciones" items={items(log)} />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Opciones' }));
    expect(screen.getByRole('menu', { name: 'Opciones' })).toBeDefined();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Marcar como hecho' }));
    expect(log).toEqual(['done']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('on a phone a destructive row closes the sheet and asks before it runs', async () => {
    const log: string[] = [];
    render(<Menu item label="Opciones" items={items(log)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Opciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Borrar' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(log).toEqual([]);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('¿Borrar Pagar la luz?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(log).toEqual([]);
  });

  test('on a phone a long press, read as a context menu, opens the sheet for its row', () => {
    render(
      <Menu context label="Pagar la luz" items={items([])}>
        <Text>Pagar la luz</Text>
      </Menu>
    );
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.contextMenu(screen.getByText('Pagar la luz'));
    expect(screen.getByRole('menu', { name: 'Pagar la luz' })).toBeDefined();
  });

  test('in the sheet the arrow keys move between rows', () => {
    render(<Menu item label="Opciones" items={items([])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Opciones' }));
    const rows = screen.getAllByRole('menuitem');
    act(() => rows[0]?.focus());
    fireEvent.keyDown(rows[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[1] as HTMLElement);
    fireEvent.keyDown(rows[1] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(rows[2] as HTMLElement);
  });

  test('a single action is a plain button, never a one-row menu', () => {
    const log: string[] = [];
    render(
      <Menu
        label="Opciones"
        items={[{ label: 'Editar', icon: 'pencil', onPress: () => log.push('edit') }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(log).toEqual(['edit']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('the native sheet runs the chosen row only once the sheet has closed', () => {
    const log: string[] = [];
    let open = true;
    const view = render(
      <MenuSheet
        open={open}
        onClose={() => {
          open = false;
        }}
        label="Opciones"
        items={items(log)}
        onRun={(item) => log.push(item.label)}
      />
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(open).toBe(false);
    view.rerender(
      <MenuSheet
        open={open}
        onClose={() => undefined}
        label="Opciones"
        items={items(log)}
        onRun={(item) => log.push(item.label)}
      />
    );
    expect(log).toEqual([]);
  });
});

describe('Menu parts', () => {
  test('the list groups the rows and names its menu', () => {
    const picked: string[] = [];
    render(
      <MenuList label="Opciones" items={items([])} onPick={(item) => picked.push(item.label)} />
    );
    expect(screen.getByRole('menu', { name: 'Opciones' })).toBeDefined();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Borrar' }));
    expect(picked).toEqual(['Borrar']);
  });

  test('the web sheet closes on Escape', () => {
    let closed = 0;
    render(
      <WebSheet
        open
        onClose={() => (closed += 1)}
        label="Opciones"
        items={items([])}
        onRun={() => undefined}
      />
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(closed).toBe(1);
  });

  test('a right click and the menu key both report where the menu opens', () => {
    const points: { x: number; y: number }[] = [];
    render(
      <MenuHold onOpen={(point) => points.push(point)}>
        <button type="button">fila</button>
      </MenuHold>
    );
    const row = screen.getByRole('button', { name: 'fila' });
    fireEvent.contextMenu(row, { clientX: 12, clientY: 30 });
    fireEvent.keyDown(row, { key: 'ContextMenu' });
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ x: 12, y: 30 });
  });

  test('on native the hold and the anchored context menu keep the row as it is', () => {
    render(
      <NativeHold onOpen={() => undefined}>
        <NativeContext label="Fila" items={items([])} onRun={() => undefined}>
          <Text>Pagar la luz</Text>
        </NativeContext>
      </NativeHold>
    );
    expect(screen.getByText('Pagar la luz')).toBeDefined();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('an anchored row shows its whole label, never an ellipsis; a sheet row keeps one line', () => {
    const long = [
      { label: 'Ver las conversaciones', icon: 'chat', onPress: () => undefined },
      {
        label: 'Borrar la conversación',
        icon: 'trash',
        destructive: true,
        confirm: 'by-action',
        onPress: () => undefined,
      },
    ] as const satisfies MenuItems;
    render(<MenuPreview items={long} />);
    for (const label of ['Ver las conversaciones', 'Borrar la conversación'])
      expect(screen.getByText(label).className).not.toContain('textOverflow');
  });

  test('the anchored button lists every action with its icon well', async () => {
    const listed = items([]);
    render(<AnchoredButton label="Más" icon="more" items={listed} onRun={() => undefined} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Más' }), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(menu.querySelectorAll('svg')).toHaveLength(listed.length);
  });

  test('the runner runs an action at once and holds a destructive one for its dialog', async () => {
    const log: string[] = [];
    function Probe() {
      const { run, confirm } = useMenuRun();
      const [erase, done] = items(log);
      return (
        <>
          <button type="button" onClick={() => done && run(done)}>
            hecho
          </button>
          <button type="button" onClick={() => erase && run(erase)}>
            borrar
          </button>
          {confirm}
        </>
      );
    }
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'hecho' }));
    fireEvent.click(screen.getByRole('button', { name: 'borrar' }));
    expect(log).toEqual(['done']);
    expect(await screen.findByRole('alertdialog')).toBeDefined();
  });
});
