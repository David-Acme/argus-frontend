import { afterEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { AccessView } from '@/shared/libs/capabilities';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { matchesWords, parseSearchScope } from '@/shared/libs/text-search';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { InfiniteListStub } from '@tests/support/infinite-list-stub';
import { surfacesFor } from '@tests/support/app-surfaces';
import { accessView } from '@/shared/libs/capabilities';

type Calls = string[];

const calls: Calls = [];
const today = new Date(2026, 9, 26, 12);

setSystemTime(today);
const at = (days: number, hours: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hours).getTime();

const hit = (
  fields: Pick<ISearchHitCacheRow, 'kind' | 'id' | 'title' | 'at'>
): ISearchHitCacheRow => ({
  allDay: false,
  parentId: null,
  recurrenceRule: null,
  ...fields,
});

const HITS: readonly ISearchHitCacheRow[] = [
  hit({ kind: 'event', id: '1', title: 'Pagar la luz', at: at(0, 23) }),
  hit({ kind: 'event', id: '2', title: 'Pagar el agua', at: at(1, 9) }),
  hit({ kind: 'person', id: '7', title: 'José Pérez', at: null }),
  hit({ kind: 'camera', id: '5', title: 'Cámara del patio', at: null }),
];

const watched: string[] = [];
const extended: string[] = [];
let moreAfter = false;

function pagedView(_key: string, scope: string, enabled: boolean) {
  if (enabled) watched.push(scope);
  const parsed = enabled ? parseSearchScope(scope) : null;
  const rows = parsed
    ? HITS.filter((row) => parsed.kinds.includes(row.kind) && matchesWords(row.title, parsed.words))
    : [];
  return {
    snapshot: parsed ? { rows, hasMore: moreAfter } : null,
    rows,
    hasMore: moreAfter,
    loadMore: () => {
      extended.push(scope);
      return Promise.resolve(true);
    },
  };
}

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
mock.module('@/shared/libs/surfaces', () => ({ useSurfaces: () => surfacesFor(view) }));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheValue: (key: string) =>
    key === VIEW_CACHE_KEYS.dashboardSummary ? { projectsTotal: 0 } : null,
}));
mock.module('@/shared/hooks/use-infinite-list', () => ({
  usePagedView: pagedView,
  useInfiniteList: ({
    hasMore,
    loadMore,
  }: {
    hasMore: boolean;
    loadMore?: () => Promise<boolean>;
  }) => ({
    footer: hasMore ? 'loading' : 'none',
    loading: false,
    onEndReached: () => void loadMore?.(),
    retry: () => undefined,
  }),
}));
mock.module('@/shared/components/ui/infinite-list', () => ({ InfiniteList: InfiniteListStub }));
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

const { useCommandLauncher, useCommandSearch } = await import('@/features/command');
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
const groups = () => screen.queryAllByTestId('command-group').map((node) => node.textContent);
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

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
  watched.length = 0;
  extended.length = 0;
  moreAfter = false;
  view = viewFor('owner');
  sendAnswer = 'sent';
});

describe('GlobalCommand', () => {
  test('nothing is mounted until the palette is first opened', () => {
    const { container } = render(<GlobalCommand />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Ctrl+K opens the palette with the new-item actions and the sections the registry offers, with their keys', () => {
    render(<GlobalCommand />);
    press('k', { ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Buscar o pedir a Argus' })).toBeDefined();
    expect(groups()).toEqual(['ACCIONES', 'IR A']);
    expect(options()).toEqual([
      'Pedirle a Argus que me recuerde…',
      'Nuevo evento',
      'Nuevo proyecto',
      'Inicio',
      'Argus',
      'Seguridad',
      'Clips',
      'Agenda',
      'Tú',
    ]);
    expect(screen.getByText('N')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    expect(watched).toEqual([]);
  });

  test('typing searches the database once it settles, «pregúntale a Argus» first, and Enter sends the text', async () => {
    render(<GlobalCommand />);
    press('k', { metaKey: true });
    type('pagar');
    await settle();
    expect(groups()).toEqual(['PEDIR A ARGUS', 'ACCIONES', 'AGENDA']);
    expect(options()).toEqual([
      '«pagar…» — pregúntale a Argus',
      'Pedirle a Argus que me recuerde «pagar…»',
      'Pagar la luz',
      'Pagar el agua',
    ]);
    expect(screen.getByText('Evento · hoy 23:00')).toBeDefined();
    expect(screen.getByText('Evento · mañana 09:00')).toBeDefined();
    expect(parseSearchScope(watched[watched.length - 1] ?? '')).toEqual({
      kinds: ['event', 'task', 'project', 'person', 'camera'],
      words: ['pagar'],
      since: new Date(2026, 9, 26).getTime(),
    });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(calls).toEqual(['send pagar', 'push "/conversations/0"']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('accents and case do not matter, and the scope chips narrow the search', async () => {
    render(<GlobalCommand />);
    press('/');
    type('JOSE');
    await settle();
    expect(options()).toContain('José Pérez');
    fireEvent.click(screen.getByRole('tab', { name: 'Cámaras' }));
    await settle();
    expect(options()).not.toContain('José Pérez');
    expect(parseSearchScope(watched[watched.length - 1] ?? '')?.kinds).toEqual(['camera']);
    expect(screen.getByRole('status').textContent).toContain('Nada coincide con «JOSE»');
  });

  test('reaching the end of the results asks the database for the next page', async () => {
    moreAfter = true;
    render(<GlobalCommand />);
    press('/');
    type('patio');
    await settle();
    expect(screen.getByTestId('infinite-list').getAttribute('data-footer')).toBe('loading');
    fireEvent.click(screen.getByRole('button', { name: 'end-reached' }));
    expect(extended.length).toBe(1);
  });

  test('a busy Argus keeps the text as a draft in the thread instead of losing it', () => {
    sendAnswer = 'busy';
    render(<GlobalCommand />);
    press('/');
    type('pagar');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(calls).toEqual(['send pagar', 'draft pagar', 'push "/conversations/0"']);
  });

  test('a result opens its screen and a new reminder starts a draft to Argus', async () => {
    render(<GlobalCommand />);
    press('/');
    type('patio');
    await settle();
    fireEvent.click(screen.getByRole('option', { name: 'Cámara del patio' }));
    expect(calls).toEqual(['push {"pathname":"/cameras/[id]","params":{"id":"5"}}']);
    calls.length = 0;
    press('/');
    type('pagar');
    fireEvent.click(
      screen.getByRole('option', { name: 'Pedirle a Argus que me recuerde «pagar…»' })
    );
    expect(calls).toEqual(['draft Recuérdame pagar', 'push "/conversations/0"']);
  });

  test('N opens only the new-item actions, never searches and never asks Argus', async () => {
    render(<GlobalCommand />);
    press('n');
    expect(groups()).toEqual(['ACCIONES']);
    type('evento');
    await settle();
    expect(options()).toEqual(['Nuevo evento', 'Pedirle a Argus que me recuerde «evento…»']);
    expect(watched).toEqual([]);
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
    expect(groups()).toEqual(['ACCIONES']);
  });

  test('a role this build does not know gets no Argus entry, no search and only the empty message', async () => {
    view = accessView(
      { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] },
      'guest'
    );
    render(<GlobalCommand />);
    press('k', { ctrlKey: true });
    type('pagar');
    await settle();
    expect(groups()).toEqual([]);
    expect(options()).toEqual([]);
    expect(watched).toEqual([]);
    expect(screen.queryByText('Pedir a Argus')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Nada coincide con «pagar»');
  });
});

type ProviderProbeProps = { query: string; scope: 'all' | 'cameras' | 'people' };

function ProviderProbe({ query, scope }: ProviderProbeProps) {
  const search = useCommandSearch({ query, scope, openedAt: today.getTime() });
  return (
    <ul aria-label={search.groups.join(',')} data-scope={search.scope}>
      {search.results.flatMap((group) =>
        group.items.map((item) => (
          <li key={item.id}>{`${group.title}|${item.label}|${item.meta ?? ''}`}</li>
        ))
      )}
    </ul>
  );
}

describe('useCommandSearch', () => {
  test('the search provider pages the same rows for any host, narrowed by its scope', async () => {
    const { rerender } = render(<ProviderProbe query="pa" scope="all" />);
    await settle();
    expect(screen.getByRole('list').getAttribute('aria-label')).toBe(
      'agenda,projects,people,cameras'
    );
    expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'Agenda|Pagar la luz|Evento · hoy 23:00',
      'Agenda|Pagar el agua|Evento · mañana 09:00',
      'Cámaras|Cámara del patio|Cámara',
    ]);
    rerender(<ProviderProbe query="pa" scope="cameras" />);
    await settle();
    expect(screen.getAllByRole('listitem').map((node) => node.textContent)).toEqual([
      'Cámaras|Cámara del patio|Cámara',
    ]);
  });
});
