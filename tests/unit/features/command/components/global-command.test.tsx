import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { AccessView } from '@/shared/libs/capabilities';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { accessView } from '@/shared/libs/capabilities';

type Calls = string[];

const calls: Calls = [];
const today = new Date();
const at = (days: number, hours: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hours).getTime();

const ROWS: Readonly<Record<string, readonly unknown[]>> = {
  [VIEW_CACHE_KEYS.reminderList]: [
    { id: '1', title: 'Pagar la luz', scheduledAt: at(0, 23), isCompleted: false },
    { id: '2', title: 'Pagar el agua', scheduledAt: at(1, 9), isCompleted: false },
  ],
  [VIEW_CACHE_KEYS.cameraList]: [{ id: '5', name: 'Cámara del patio' }],
};

let view: AccessView = viewFor('owner');
let sendAnswer = 'sent';

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useIsFocused: () => screenFocus.focused,
  useRouter: () => ({
    setParams: () => undefined,
    push: (href: unknown) => calls.push(`push ${JSON.stringify(href)}`),
    navigate: (href: unknown) => calls.push(`navigate ${JSON.stringify(href)}`),
  }),
}));
mock.module('@/features/voice', () => ({
  useAssistantChat: () => ({
    send: (text: string) => {
      calls.push(`send ${text}`);
      return sendAnswer;
    },
    setDraft: (text: string) => calls.push(`draft ${text}`),
  }),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({ useAccessView: () => view }));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: (key: string) => ROWS[key] ?? [],
}));
mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () =>
    createDateFormatter('es', {
      languageTag: 'es-PE',
      regionCode: 'PE',
      uses24hourClock: true,
      firstWeekday: 2,
      timeZone: null,
    }),
}));
mock.module('@/shared/libs/assistant-mode', () => ({
  rememberAssistantMode: (mode: string) => calls.push(`mode ${mode}`),
}));

const { useCommandLauncher } = await import('@/features/command');
const { GlobalCommand } = await import('@/features/command/components/global-command');
const { useCommandStore } = await import('@/features/command/stores/command.store');

const input = () => screen.getByRole('combobox', { name: 'Buscar o pedir a Argus' });
const press = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    fireEvent.keyDown(globalThis.document, { key, ...init });
  });
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });
const options = () =>
  screen.queryAllByRole('option').map((node) => node.getAttribute('aria-label'));
const groups = () => screen.queryAllByRole('group').map((node) => node.getAttribute('aria-label'));

type LauncherProps = { query?: string };

function Launcher({ query }: LauncherProps) {
  const launcher = useCommandLauncher();
  return (
    <>
      <button type="button" onClick={() => launcher.open(query)}>
        buscar
      </button>
      <button type="button" onClick={launcher.openNew}>
        nuevo
      </button>
    </>
  );
}

afterEach(() => {
  act(() => useCommandStore.getState().close());
  calls.length = 0;
  view = viewFor('owner');
  sendAnswer = 'sent';
});

describe('GlobalCommand', () => {
  test('nothing is mounted until the palette is first opened', () => {
    const { container } = render(<GlobalCommand />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Ctrl+K opens the palette with the new-item actions and the five sections with their keys', () => {
    render(<GlobalCommand />);
    press('k', { ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Buscar o pedir a Argus' })).toBeDefined();
    expect(groups()).toEqual(['Acciones', 'Ir a']);
    expect(options()).toEqual([
      'Nuevo recordatorio',
      'Nuevo evento',
      'Nuevo proyecto',
      'Inicio',
      'Seguridad',
      'Argus',
      'Agenda',
      'Tú',
    ]);
    expect(screen.getByText('N')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  test('typing filters local results into groups, «pregúntale a Argus» first, and Enter sends the text to Argus', () => {
    render(<GlobalCommand />);
    press('k', { metaKey: true });
    type('pagar');
    expect(groups()).toEqual(['Pedir a Argus', 'Agenda', 'Acciones']);
    expect(options()).toEqual([
      '«pagar…» — pregúntale a Argus',
      'Pagar la luz',
      'Pagar el agua',
      'Nuevo recordatorio «pagar…»',
    ]);
    expect(screen.getByText('· hoy 23:00')).toBeDefined();
    expect(screen.getByText('· mañana 09:00')).toBeDefined();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(calls).toEqual(['send pagar', 'mode chat', 'push "/conversations/0"']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a busy Argus keeps the text as a draft in the thread instead of losing it', () => {
    sendAnswer = 'busy';
    render(<GlobalCommand />);
    press('/');
    type('pagar');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(calls).toEqual(['send pagar', 'draft pagar', 'mode chat', 'push "/conversations/0"']);
  });

  test('a result opens its screen and a new reminder starts a draft to Argus', () => {
    render(<GlobalCommand />);
    press('/');
    type('patio');
    fireEvent.click(screen.getByRole('option', { name: 'Cámara del patio' }));
    expect(calls).toEqual(['push {"pathname":"/cameras/[id]","params":{"id":"5"}}']);
    calls.length = 0;
    press('/');
    type('pagar');
    fireEvent.click(screen.getByRole('option', { name: 'Nuevo recordatorio «pagar…»' }));
    expect(calls).toEqual(['draft Recuérdame pagar', 'mode chat', 'push "/conversations/0"']);
  });

  test('N opens only the new-item actions and never asks Argus', () => {
    render(<GlobalCommand />);
    press('n');
    expect(groups()).toEqual(['Acciones']);
    type('evento');
    expect(options()).toEqual(['Nuevo evento', 'Nuevo recordatorio «evento…»']);
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(calls).toEqual(['push {"pathname":"/agenda","params":{"new":"event"}}']);
  });

  test('/ and N typed into a field stay in the field, and Esc closes the palette', () => {
    render(
      <>
        <input aria-label="nota" />
        <GlobalCommand />
      </>
    );
    act(() => {
      fireEvent.keyDown(screen.getByLabelText('nota'), { key: '/' });
      fireEvent.keyDown(screen.getByLabelText('nota'), { key: 'n' });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    press('k', { ctrlKey: true });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('the launcher opens the palette with a query, or on the new-item actions', () => {
    render(
      <>
        <Launcher query="patio" />
        <GlobalCommand />
      </>
    );
    fireEvent.click(screen.getByText('buscar'));
    expect((input() as HTMLInputElement).value).toBe('patio');
    expect(options()).toContain('Cámara del patio');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByText('nuevo'));
    expect(groups()).toEqual(['Acciones']);
  });

  test('a role this build does not know gets no Argus entry and no results', () => {
    view = accessView(
      { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] },
      'guest'
    );
    render(<GlobalCommand />);
    press('k', { ctrlKey: true });
    type('pagar');
    expect(groups()).toEqual([]);
    expect(options()).toEqual([]);
    expect(screen.queryByText('Pedir a Argus')).toBeNull();
  });
});
