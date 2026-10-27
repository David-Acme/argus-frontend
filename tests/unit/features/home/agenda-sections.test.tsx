import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { AgendaItem, AgendaMenuAction, DashboardProjectCard } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import type { Agenda } from '@/features/home/hooks/use-agenda';
import type { AgendaActions } from '@/features/home/hooks/use-agenda-actions';
import { agendaMenu, agendaRights } from '@/features/agenda/model/agenda-actions';
import { screenFocus } from '../../shared/ui/screen-focus';
import '../../shared/ui/translation-stub';
import { at, items, prototypeDay, task, TODAY, TOMORROW, wording } from './agenda-fixtures';

type Calls = {
  toggled: string[];
  opened: string[];
  ran: string[];
  asked: string[];
  pushed: unknown[];
};

const calls: Calls = { toggled: [], opened: [], ran: [], asked: [], pushed: [] };

const state: {
  agenda: Agenda | null;
  caps: Set<string>;
  askable: boolean;
  rows: Map<string, readonly unknown[]>;
} = { agenda: null, caps: new Set(), askable: true, rows: new Map() };

function actions(): AgendaActions {
  const rightsOf = (item: AgendaItem) => agendaRights(item, () => true);
  return {
    rightsOf,
    menuOf: (item: AgendaItem) => agendaMenu(rightsOf(item)),
    toggle: (item) => calls.toggled.push(item.title),
    open: (item) => calls.opened.push(item.title),
    run: (item: AgendaItem, action: AgendaMenuAction) => calls.ran.push(`${action}:${item.title}`),
  };
}

function agenda(list: readonly AgendaItem[], extra: Partial<Agenda> = {}): Agenda {
  return {
    visible: true,
    synced: true,
    items: list,
    today: TODAY,
    tomorrow: TOMORROW,
    wording,
    actions: actions(),
    ...extra,
  };
}

mock.module('@/features/home/hooks/use-agenda', () => ({ useAgenda: () => state.agenda }));
mock.module('@/features/home/hooks/use-ask-argus', () => ({
  useAskArgus: () => (state.askable ? (draft: string) => calls.asked.push(draft) : null),
}));
mock.module('@/features/agenda', async () => ({
  ...(await import('@/features/agenda/model/agenda-items')),
  ...(await import('@/features/agenda/model/agenda-actions')),
  ...(await import('@/features/agenda/model/agenda-timeline')),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: (capability: string) => state.caps.has(capability) }),
}));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: (key: string, scope?: string) =>
    state.rows.get(scope ? `${key}.${scope}` : key) ?? [],
}));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: (href: unknown) => calls.pushed.push(href),
    setParams: () => undefined,
  }),
  useIsFocused: () => screenFocus.focused,
}));

const { NowSection } = await import('@/features/home/components/agenda/now-section');
const { TodaySection } = await import('@/features/home/components/agenda/today-section');
const { TomorrowSection } = await import('@/features/home/components/agenda/tomorrow-section');
const { ProjectsSection } = await import('@/features/home/components/agenda/projects-section');
const { AgendaRow } = await import('@/features/home/components/agenda/agenda-row');
const { AgendaEmpty } = await import('@/features/home/components/agenda/agenda-empty');
const { FreeRow } = await import('@/features/home/components/agenda/free-row');
const { ScreenColumnProvider } = await import('@/shared/ui/screen/screen-column-context');

function inColumn(children: ReactNode) {
  return <ScreenColumnProvider value>{children}</ScreenColumnProvider>;
}

const rowNamed = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  calls.toggled = [];
  calls.opened = [];
  calls.ran = [];
  calls.asked = [];
  calls.pushed = [];
  state.caps = new Set([CAPABILITY.agendaRead, CAPABILITY.projectsRead]);
  state.askable = true;
  state.rows = new Map();
  state.agenda = agenda(prototypeDay());
});

describe('Ahora', () => {
  test('the card counts the due items and shows three rows, overdue first, with their time-to-go', () => {
    render(<NowSection />);
    expect(screen.getByRole('heading', { name: 'Ahora' })).toBeDefined();
    expect(screen.getByText('5 · 1 atrasado')).toBeDefined();
    expect(rowNamed('Llamar al plomero').getAttribute('aria-label')).toBe(
      'Llamar al plomero, Atrasado · 11:00'
    );
    expect(screen.getByText('hace 4 h')).toBeDefined();
    expect(screen.getByText('ahora')).toBeDefined();
    expect(screen.getByText('en 1 h')).toBeDefined();
    expect(screen.queryByText('Clase de guitarra')).toBeNull();
  });

  test('a task completes from its check, and a tap opens its row', () => {
    render(<NowSection />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar «Pagar la luz» como hecho' }));
    expect(calls.toggled).toEqual(['Pagar la luz']);
    fireEvent.click(rowNamed('Pagar la luz'));
    fireEvent.click(rowNamed('Reunión con el arquitecto'));
    expect(calls.opened).toEqual(['Pagar la luz', 'Reunión con el arquitecto']);
  });

  test('a right click on an event opens its menu with Editar and Borrar', async () => {
    render(<NowSection />);
    fireEvent.contextMenu(screen.getByText('Reunión con el arquitecto'));
    const named = (name: string) => screen.findByRole('menuitem', { name, hidden: true });
    expect(await named('Editar')).toBeDefined();
    fireEvent.click(await named('Borrar'));
    expect(calls.ran).toEqual(['delete:Reunión con el arquitecto']);
  });

  test('the same card renders inside a desktop column', () => {
    render(inColumn(<NowSection />));
    expect(screen.getAllByRole('button', { name: /,/ })).toHaveLength(3);
  });

  test('nothing due shows the empty card, whose action and ideas ask Argus', () => {
    state.agenda = agenda([]);
    render(<NowSection />);
    expect(screen.getByText('Nada pendiente hoy')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Pídeselo a Argus' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Pedirle a Argus: Recuérdame pagar el agua' })
    );
    expect(calls.asked).toEqual(['Recuérdame ', 'Recuérdame pagar el agua']);
    expect(screen.getByText('«¿Qué tengo mañana?»')).toBeDefined();
  });

  test('in a desktop column the ideas get their own heading under the card', () => {
    state.agenda = agenda([]);
    render(inColumn(<NowSection />));
    expect(screen.getAllByRole('heading').map((node) => node.textContent)).toEqual([
      'Ahora',
      'Ideas para empezar',
    ]);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  test('without the Argus chat the empty card keeps its words and drops the action and ideas', () => {
    state.agenda = agenda([]);
    state.askable = false;
    render(<NowSection />);
    expect(screen.getByText('Nada pendiente hoy')).toBeDefined();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('before the first sync, or when nothing is readable, Ahora renders nothing', () => {
    state.agenda = agenda([], { synced: false });
    const first = render(<NowSection />);
    expect(first.container.textContent).toBe('');
    first.unmount();
    state.agenda = agenda(prototypeDay(), { visible: false });
    expect(render(<NowSection />).container.textContent).toBe('');
  });
});

describe('Hoy and Mañana', () => {
  test('Hoy is the whole day with the done struck through and the free slots in place', () => {
    render(inColumn(<TodaySection />));
    const section = screen.getByRole('heading', { name: 'Hoy' }).parentElement!.parentElement!;
    expect(within(section).getAllByText('Libre')).toHaveLength(2);
    expect(within(section).getByText('16:00 – 17:00')).toBeDefined();
    expect(within(section).getByText('19:00 – 21:00')).toBeDefined();
    expect(within(section).getByText('14:30 – 16:00 · en curso')).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'Marcar «Yoga» como pendiente' })).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Agenda' }));
    expect(calls.pushed).toEqual(['/agenda']);
  });

  test('a day with nothing reads Día libre, and Hoy drops its Agenda link without the agenda', () => {
    state.agenda = agenda([]);
    state.caps = new Set();
    render(<TodaySection />);
    expect(screen.getByText('Día libre')).toBeDefined();
    expect(screen.getByText('Sin eventos ni tareas')).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('Mañana lists tomorrow only, and is free when tomorrow is empty', () => {
    const first = render(<TomorrowSection />);
    expect(screen.getByRole('heading', { name: 'Mañana' })).toBeDefined();
    expect(rowNamed('Pagar el agua').getAttribute('aria-label')).toBe('Pagar el agua, 09:00');
    expect(screen.queryByText('Pagar la luz')).toBeNull();
    first.unmount();
    state.agenda = agenda(items([task('hoy', at(20))]));
    render(inColumn(<TomorrowSection />));
    expect(screen.getByText('Día libre')).toBeDefined();
  });
});

describe('Proyectos', () => {
  const card = (id: string, done: number, total: number): DashboardProjectCard => ({
    id,
    name: id,
    description: '',
    status: 'active',
    done,
    total,
    progress: total ? done / total : 0,
  });

  beforeEach(() => {
    state.rows.set(VIEW_CACHE_KEYS.dashboardProjects, [
      card('Mudanza', 3, 8),
      card('Huerto', 1, 4),
    ]);
    state.rows.set(`${VIEW_CACHE_KEYS.projectTasks}.Mudanza`, [
      {
        id: 't',
        projectId: 'Mudanza',
        title: 'Comprar cajas',
        status: 'todo',
        priority: 'none',
        dueAt: null,
      },
    ]);
  });

  test('each project reads its progress and next task, and opens its board', () => {
    render(<ProjectsSection />);
    expect(rowNamed('Mudanza').getAttribute('aria-label')).toBe(
      'Mudanza, 3 de 8 hechas · próxima: Comprar cajas'
    );
    expect(rowNamed('Huerto').getAttribute('aria-label')).toBe('Huerto, 1 de 4 hechas');
    fireEvent.click(rowNamed('Huerto'));
    fireEvent.click(screen.getByRole('link', { name: 'Ver' }));
    expect(calls.pushed).toEqual([
      { pathname: '/projects', params: { id: 'Huerto' } },
      '/projects',
    ]);
  });

  test('the column form keeps up to five open projects', () => {
    state.rows.set(
      VIEW_CACHE_KEYS.dashboardProjects,
      ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => card(id, 0, 1))
    );
    const first = render(<ProjectsSection />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    first.unmount();
    render(inColumn(<ProjectsSection />));
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  test('without the projects capability, or with no open project, it renders nothing', () => {
    state.caps = new Set();
    const first = render(<ProjectsSection />);
    expect(first.container.textContent).toBe('');
    first.unmount();
    state.caps = new Set([CAPABILITY.projectsRead]);
    state.rows.set(VIEW_CACHE_KEYS.dashboardProjects, []);
    expect(render(<ProjectsSection />).container.textContent).toBe('');
  });
});

describe('the agenda row pieces', () => {
  const readOnly: AgendaActions = {
    ...actions(),
    rightsOf: () => ({ toggle: false, edit: false, remove: false }),
    menuOf: () => [],
  };

  test('a read-only task row shows its state and no menu, and a tap opens it', () => {
    const plumber = prototypeDay().find((item) => item.title === 'Llamar al plomero')!;
    render(<AgendaRow item={plumber} place="now" wording={wording} actions={readOnly} />);
    expect(screen.getByRole('checkbox')).toBeDefined();
    fireEvent.click(rowNamed('Llamar al plomero'));
    expect(calls.opened).toEqual(['Llamar al plomero']);
    expect(calls.toggled).toEqual([]);
  });

  test('an event leads with its mark and opens even when read-only', () => {
    const meeting = prototypeDay().find((item) => item.kind === 'event')!;
    render(<AgendaRow item={meeting} place="day" wording={wording} actions={readOnly} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(rowNamed('Reunión con el arquitecto'));
    expect(calls.opened).toEqual(['Reunión con el arquitecto']);
  });

  test('a free row and the empty card read on their own', () => {
    render(
      <>
        <FreeRow title="Libre" meta="16:00 – 17:00" />
        <AgendaEmpty title="Ahora" />
      </>
    );
    expect(screen.getByText('16:00 – 17:00')).toBeDefined();
    expect(screen.getByText('Nada pendiente hoy')).toBeDefined();
  });
});
