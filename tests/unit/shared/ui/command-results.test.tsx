import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import type { CommandGroup, CommandView } from '@/shared/ui/command/command-types';
import { InfiniteListStub } from '@tests/support/infinite-list-stub';
import './translation-stub';

mock.module('@/shared/components/ui/infinite-list', () => ({ InfiniteList: InfiniteListStub }));

const { CommandPanel } = await import('@/shared/ui/command/command-panel');
const { commandEmpty, useCommand } = await import('@/shared/ui/command/use-command');
const { commandRows } = await import('@/shared/ui/command/command-list');
const { GroupTitle, Key } = await import('@/shared/ui/command/command-rows');
const { CommandScopes } = await import('@/shared/ui/command/command-scopes');
const { CommandEmptyState } = await import('@/shared/ui/command/command-empty');

type HarnessProps = {
  view: CommandView;
  initialQuery?: string;
  room?: number;
  asks?: boolean;
  log?: string[];
};

const ACTIONS: readonly CommandGroup[] = [
  {
    title: 'Acciones',
    items: [
      { id: 'new', label: 'Nuevo evento', icon: 'plus', ink: 'accent', onRun: () => undefined },
    ],
  },
];

function Harness({ view, initialQuery, room, asks = true, log = [] }: HarnessProps) {
  const state = useCommand({
    source: () => view,
    onAsk: asks ? (query) => log.push(`ask:${query}`) : undefined,
    onQueryChange: (query) => log.push(`query:${query}`),
    onClose: () => log.push('close'),
    initialQuery,
  });
  return <CommandPanel state={state} room={room} />;
}

const paging = (footer: InfiniteListState['footer'], log: string[]): InfiniteListState => ({
  footer,
  loading: false,
  onEndReached: () => log.push('more'),
  retry: () => undefined,
});

describe('command empty states', () => {
  test('a query that matches nothing centres a message with the ask and the actions under it', () => {
    const log: string[] = [];
    render(<Harness view={{ actions: ACTIONS, results: [] }} initialQuery="xyz" log={log} />);
    expect(screen.getByRole('status').textContent).toContain('Nada coincide con «xyz»');
    expect(screen.queryByTestId('infinite-list')).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: '«xyz…» — pregúntale a Argus' }));
    expect(log).toEqual(['ask:xyz', 'close']);
  });

  test('while the first page is on its way the empty message waits', () => {
    render(<Harness view={{ actions: [], results: [], pending: true }} initialQuery="pa" />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('with nothing typed and nothing to offer the start message is shown', () => {
    render(<Harness view={{ actions: [] }} asks={false} />);
    expect(screen.getByRole('status').textContent).toContain('Busca en tu casa');
  });

  test('typing reports the trimmed query', () => {
    const log: string[] = [];
    render(<Harness view={{ actions: ACTIONS, results: [] }} log={log} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '  luz ' } });
    expect(log).toContain('query:luz');
  });
});

describe('command results list', () => {
  test('results page through the infinite list and reaching its end asks for more', () => {
    const log: string[] = [];
    const view: CommandView = {
      actions: [],
      results: [
        {
          title: 'Cámaras',
          items: [{ id: 'cam', label: 'Patio', icon: 'cam', onRun: () => undefined }],
        },
      ],
      paging: paging('loading', log),
    };
    render(<Harness view={view} initialQuery="pat" log={log} room={500} />);
    expect(screen.getByTestId('infinite-list').getAttribute('data-footer')).toBe('loading');
    expect(Number(screen.getByTestId('infinite-list').getAttribute('data-max'))).toBeLessThan(500);
    fireEvent.click(screen.getByRole('button', { name: 'end-reached' }));
    expect(log).toContain('more');
  });

  test('scope chips switch what the search covers', () => {
    const chosen: string[] = [];
    const view: CommandView = {
      actions: ACTIONS,
      results: [],
      pending: true,
      scopes: {
        options: [
          { key: 'all', label: 'Todo' },
          { key: 'people', label: 'Personas' },
        ],
        value: 'all',
        onChange: (key) => chosen.push(key),
      },
    };
    render(<Harness view={view} initialQuery="an" />);
    expect(screen.getByRole('tab', { name: 'Todo' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Personas' }));
    expect(chosen).toEqual(['people']);
  });

  test('without a query there are no scope chips', () => {
    const view: CommandView = {
      actions: ACTIONS,
      scopes: { options: [{ key: 'all', label: 'Todo' }], value: 'all', onChange: () => undefined },
    };
    render(<Harness view={view} />);
    expect(screen.queryByRole('tab')).toBeNull();
  });
});

describe('command model', () => {
  test('the empty state depends on the query, the results and whether a page is still coming', () => {
    const groups = ACTIONS;
    expect(commandEmpty({ query: '', groups: [], found: null, pending: false })).toBe('start');
    expect(commandEmpty({ query: '', groups, found: null, pending: false })).toBeNull();
    expect(commandEmpty({ query: 'x', groups, found: 0, pending: false })).toBe('results');
    expect(commandEmpty({ query: 'x', groups, found: 0, pending: true })).toBeNull();
    expect(commandEmpty({ query: 'x', groups, found: 2, pending: false })).toBeNull();
    expect(commandEmpty({ query: 'x', groups, found: null, pending: false })).toBeNull();
    expect(commandEmpty({ query: 'x', groups: [], found: null, pending: false })).toBe('results');
  });

  test('rows flatten the ask, each group title and its items with their keyboard index', () => {
    const groups: readonly CommandGroup[] = [
      ...ACTIONS,
      { title: 'Agenda', items: [{ id: 'a', label: 'Luz', icon: 'cal', onRun: () => undefined }] },
    ];
    const rows = commandRows({ asks: true, groups }, 'Pedir a Argus');
    expect(
      rows.map((row) => (row.type === 'item' ? `${row.item.id}@${row.index}` : row.type))
    ).toEqual(['title', 'ask', 'title', 'new@1', 'title', 'a@2']);
  });
});

describe('command parts', () => {
  test('a group title is shown in capitals and a key hint as written', () => {
    render(
      <>
        <GroupTitle title="Personas" />
        <Key label="⌘K" />
      </>
    );
    expect(screen.getByTestId('command-group').textContent).toBe('PERSONAS');
    expect(screen.getByText('⌘K')).toBeDefined();
  });

  test('the scope chips are tabs and only the current one is selected', () => {
    const chosen: string[] = [];
    render(
      <CommandScopes
        scopes={{
          options: [
            { key: 'all', label: 'Todo' },
            { key: 'cameras', label: 'Cámaras' },
          ],
          value: 'cameras',
          onChange: (key) => chosen.push(key),
        }}
      />
    );
    expect(screen.getByRole('tablist', { name: 'Buscar en' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Cámaras' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Todo' }).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByRole('tab', { name: 'Todo' }));
    expect(chosen).toEqual(['all']);
  });

  test('the empty state alone shows its words and offers nothing when there is nothing to run', () => {
    function Lonely() {
      const state = useCommand({
        source: () => ({ actions: [], results: [] }),
        onClose: () => undefined,
      });
      return <CommandEmptyState state={state} empty="results" fill={false} />;
    }
    render(<Lonely />);
    expect(screen.getByRole('status').textContent).toContain('Prueba con otra palabra');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
