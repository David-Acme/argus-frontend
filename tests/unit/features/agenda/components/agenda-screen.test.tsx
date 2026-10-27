import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { AgendaItem, DashboardProjectCard } from '@/core/types';
import { at, date, entry, items, NOW, reminder } from '../../home/agenda-fixtures';
import '../../../shared/ui/translation-stub';
import { setWindowWidth } from '../../../shared/ui/window-width';

type Calls = {
  pushed: unknown[];
  created: string[];
  saved: string[];
  asked: string[];
};

const calls: Calls = { pushed: [], created: [], saved: [], asked: [] };

const state: {
  items: AgendaItem[];
  caps: Set<string>;
  writes: boolean;
  params: Record<string, string>;
  projects: DashboardProjectCard[];
} = { items: [], caps: new Set(), writes: true, params: {}, projects: [] };

const project: DashboardProjectCard = {
  id: '7',
  name: 'Mudanza',
  description: '',
  status: 'active',
  done: 3,
  total: 8,
  progress: 0.4,
};

const busyDay = (): AgendaItem[] =>
  items(
    [
      reminder('Pagar la luz', at(11)),
      reminder('Sacar la basura', at(20), { recurrenceRule: 'FREQ=WEEKLY' }),
    ],
    [
      entry('event:tecnico', at(16, 30), {
        title: 'Llamar al técnico',
        endsAt: at(17),
        location: 'Casa',
        ownerId: '1',
      }),
      entry('event:cena', at(21), { title: 'Cena con Luis', endsAt: at(22), ownerId: '2' }),
      entry('event:daily', at(8), {
        title: 'Daily',
        endsAt: at(8, 30),
        ownerId: '1',
        series: { rule: 'FREQ=DAILY', startsAt: at(8), endsAt: null },
        id: 'event:daily@2026-10-21T13:00:00.000Z',
      }),
      entry('task:cajas', at(0), {
        title: 'Comprar cajas',
        source: 'task',
        isAllDay: true,
        projectId: '7',
        createdVia: 'assistant',
      }),
      entry('event:gasfitero', at(9, 0, 1), {
        title: 'Gasfitero',
        endsAt: at(10, 0, 1),
        ownerId: '1',
      }),
    ]
  );

mock.module('@/core/services/database.service', () => ({
  DatabaseService: class {
    readonly table: string;

    constructor(table: string) {
      this.table = table;
    }
  },
}));

mock.module('@/core/services/calendar-event.service', () => ({ calendarEventService: {} }));
mock.module('@/core/services/project-task.service', () => ({ projectTaskService: {} }));
mock.module('@/shared/libs/optimistic-action', () => ({ runOptimistic: () => Promise.resolve() }));
mock.module('@/features/agenda/components/calendar-event-share-dialog', () => ({
  CalendarEventShareDialog: () => null,
}));

mock.module('expo-router', () => ({
  useRouter: () => ({ push: (href: unknown) => calls.pushed.push(href) }),
  useLocalSearchParams: () => state.params,
  useIsFocused: () => true,
}));

mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => date }));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    has: (capability: string) => state.caps.has(capability),
    can: () => state.writes,
    roleActive: true,
  }),
}));

mock.module('@/shared/libs/route-access', () => ({ routeFallback: () => null }));

mock.module('@/shared/libs/capabilities', () => ({
  peopleAccessOf: () => ({ receivesDirectory: true }),
}));

mock.module('@/features/command', () => ({
  useCommandLauncher: () => ({ open: () => calls.pushed.push('search'), openNew: () => undefined }),
}));

mock.module('@/features/voice', () => ({
  setAssistantDraft: (text: string) => calls.asked.push(text),
}));

mock.module('@/features/agenda/hooks/use-agenda-plan', () => ({
  useAgendaPlan: () => ({
    visible: true,
    items: state.items,
    now: NOW,
    viewer: '1',
    owners: new Map([['2', 'Luis Paz']]),
    projects: state.projects,
  }),
}));

mock.module('@/features/agenda/services/item-commands', () => ({
  createItem: ({ draft }: { draft: { kind: string; title: string } }) => {
    calls.created.push(`${draft.kind}:${draft.title}`);
    return Promise.resolve();
  },
  saveItem: ({ draft, scope }: { draft: { title: string }; scope: string }) => {
    calls.saved.push(`${scope}:${draft.title}`);
    return Promise.resolve();
  },
}));

const { default: AgendaScreen } = await import('@/features/agenda/screens/agenda-screen');
const { PhoneAgenda, PanesAgenda } = await import('@/features/agenda/components/agenda-layouts');
const { asideBlocks } = await import('@/features/agenda/components/agenda-aside');
const { AgendaBody, AgendaHead } = await import('@/features/agenda/components/agenda-body');
const { AgendaGuide, NextDays } = await import('@/features/agenda/components/agenda-guide');
const { AgendaLine } = await import('@/features/agenda/components/agenda-line');
const { AgendaList } = await import('@/features/agenda/components/agenda-list');
const { AgendaTop } = await import('@/features/agenda/components/agenda-top');
const { DayEmpty } = await import('@/features/agenda/components/day-empty');
const { DayField } = await import('@/features/agenda/components/day-field');
const { DayHead } = await import('@/features/agenda/components/day-head');
const { DayView } = await import('@/features/agenda/components/day-view');
const { EventBar } = await import('@/features/agenda/components/event-bar');
const { detailBlocks } = await import('@/features/agenda/components/item-detail');
const { ItemFields } = await import('@/features/agenda/components/item-fields');
const { ItemSheet } = await import('@/features/agenda/components/item-sheet');
const { MonthGrid } = await import('@/features/agenda/components/month-grid');
const { WeekStrip } = await import('@/features/agenda/components/week-strip');

const exported = [
  PhoneAgenda,
  PanesAgenda,
  asideBlocks,
  AgendaBody,
  AgendaHead,
  AgendaGuide,
  NextDays,
  AgendaList,
  AgendaTop,
  DayHead,
  DayView,
  detailBlocks,
  ItemFields,
  ItemSheet,
  WeekStrip,
];

const flush = () => act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));

const line = (title: string) =>
  screen.getAllByRole('button', { name: new RegExp(`^${title},`) })[0];

beforeEach(() => {
  calls.pushed = [];
  calls.created = [];
  calls.saved = [];
  calls.asked = [];
  state.items = busyDay();
  state.caps = new Set(['reminders.read', 'reminders.write', 'agenda.read', 'messages.relay']);
  state.writes = true;
  state.params = { at: String(NOW) };
  state.projects = [project];
});

afterEach(() => setWindowWidth(360));

describe('Agenda on a phone', () => {
  test('the month, the view chips, the week strip and the day list with its overdue count', () => {
    render(<AgendaScreen />);
    expect(screen.getByRole('heading', { name: 'Octubre' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Agenda' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('1 atrasado')).toBeDefined();
    expect(screen.getByText('Atrasado desde las 11:00')).toBeDefined();
    expect(screen.getByText('Evento compartido · Luis Paz')).toBeDefined();
    expect(screen.getAllByText('Libre').length).toBeGreaterThan(0);
    expect(exported.every((component) => typeof component === 'function')).toBe(true);
  });

  test('a task Argus made says «por Argus» in its line, and only that one', () => {
    render(<AgendaScreen />);
    expect(screen.getAllByText(/por Argus/)).toHaveLength(1);
    expect(screen.getByText(/^Tarea · .*por Argus$/)).toBeDefined();
  });

  test('a task has its check, a reminder is read-only and asks Argus, an event opens its detail', async () => {
    render(<AgendaScreen />);
    expect(
      screen.getByRole('checkbox', { name: 'Marcar «Comprar cajas» como hecho' })
    ).toBeDefined();
    expect(screen.queryByRole('checkbox', { name: 'Marcar «Pagar la luz» como hecho' })).toBeNull();
    const asked = line('Pagar la luz');
    if (!asked) throw new Error('no reminder');
    fireEvent.click(asked);
    expect(calls.asked).toEqual(['Cuéntame del recordatorio «Pagar la luz»']);
    const row = line('Llamar al técnico');
    if (!row) throw new Error('no line');
    fireEvent.click(row);
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Evento' });
    expect(within(sheet).getByText('Lugar')).toBeDefined();
    expect(within(sheet).getByRole('button', { name: 'Editar' })).toBeDefined();
  });

  test('the + opens one Nuevo sheet, an event by default, that refuses an empty name and saves', async () => {
    render(<AgendaScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento o tarea' }));
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Nuevo evento' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(within(sheet).getByText('Escribe un nombre.')).toBeDefined();
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Nombre del evento' }), {
      target: { value: 'Cita' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(calls.created).toEqual(['event:Cita']);
  });

  test('the type chip is Evento or Tarea, never Recordatorio: Argus creates reminders', async () => {
    render(<AgendaScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento o tarea' }));
    await flush();
    expect(screen.queryByRole('tab', { name: 'Recordatorio' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Todo el día' })).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Tarea' }));
    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeDefined();
  });

  test('Command’s «Nuevo evento» opens the sheet as an event', async () => {
    state.params = { at: String(NOW), new: 'event' };
    render(<AgendaScreen />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'Nuevo evento' })).toBeDefined();
  });

  test('editing a series asks «Solo esta» or «Toda la serie»', async () => {
    render(<AgendaScreen />);
    const row = line('Daily');
    if (!row) throw new Error('no line');
    fireEvent.click(row);
    await flush();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Evento' })).getByRole('button', {
        name: 'Editar',
      })
    );
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Editar evento' });
    expect(within(sheet).getAllByText('Solo esta').length).toBeGreaterThan(0);
    expect(within(sheet).getAllByText('Toda la serie').length).toBeGreaterThan(0);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(calls.saved).toEqual(['one:Daily']);
  });

  test('the month opens from the title and Día shows the hours', () => {
    render(<AgendaScreen />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar el mes' })[0] ?? document.body);
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Día' }));
    expect(screen.getByText('07:00')).toBeDefined();
  });

  test('with no data the day says so, offers an event and asks Argus for reminders, and the next days are free', () => {
    state.items = [];
    render(<AgendaScreen />);
    expect(screen.getByText('Nada para hoy')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Nuevo evento' })).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Pedirle a Argus: Recuérdame pagar la luz el lunes' })
    );
    expect(calls.asked).toEqual(['Recuérdame pagar la luz el lunes']);
    expect(screen.getAllByText('Todo el día').length).toBe(6);
  });

  test('a read-only guest gets no + and no checks', () => {
    state.caps = new Set(['agenda.read', 'reminders.read']);
    state.writes = false;
    render(<AgendaScreen />);
    expect(screen.queryByRole('button', { name: 'Nuevo evento o tarea' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('Agenda on a desktop', () => {
  test('the mini month and «Mostrar» sit beside the list and the first item’s detail', () => {
    setWindowWidth(1440);
    render(<AgendaScreen />);
    expect(screen.getByLabelText('Calendario')).toBeDefined();
    expect(screen.getByText('Mostrar')).toBeDefined();
    expect(screen.getByText('Libre hoy')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Pagar la luz' })).toBeDefined();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compartido conmigo' }));
    expect(screen.queryByText('Cena con Luis')).toBeNull();
  });

  test('with no data the detail explains the agenda instead of sitting blank', () => {
    setWindowWidth(1440);
    state.items = [];
    render(<AgendaScreen />);
    expect(screen.getByText('Así funciona tu agenda')).toBeDefined();
    expect(screen.getByText('Próximos días')).toBeDefined();
    expect(screen.getByText('Prueba a decirle')).toBeDefined();
  });

  test('a tablet shows the list beside the detail', () => {
    setWindowWidth(820);
    render(<AgendaScreen />);
    expect(screen.getByLabelText('Lo que tienes')).toBeDefined();
    expect(screen.getByLabelText('Detalle')).toBeDefined();
    expect(screen.queryByLabelText('Calendario')).toBeNull();
  });
});

describe('the agenda parts', () => {
  test('a line, a bar, an empty day and the month grid render alone', () => {
    const picked: number[] = [];
    render(
      <>
        <AgendaLine
          title="Libre"
          words={{
            time: '15:00',
            allDay: false,
            state: '2 h',
            meta: 'Hasta las 17:00',
            alert: false,
          }}
          look="free"
        />
        <EventBar look="series" />
        <DayEmpty today={false} />
        <MonthGrid
          cells={[{ at: at(0), today: true, selected: true, marked: true, inMonth: true }]}
          names={{ letter: () => 'L', number: () => '21', full: () => 'miércoles 21' }}
          onPick={(day) => picked.push(day)}
        />
      </>
    );
    expect(screen.getByText('Nada este día')).toBeDefined();
    expect(screen.getByText('Aquí verás lo que te compartan.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'miércoles 21' }));
    expect(picked).toEqual([at(0)]);
  });

  test('the day field opens a month and picks a day', () => {
    const days: number[] = [];
    render(<DayField day={at(0)} now={NOW} onChange={(day) => days.push(day)} />);
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    const next = at(0, 0, 1);
    fireEvent.click(
      screen.getAllByRole('button', { name: date.formatFullDate(new Date(next)) })[0] ??
        document.body
    );
    expect(days).toEqual([next]);
  });
});
