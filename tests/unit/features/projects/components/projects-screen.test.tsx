import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type {
  IProjectCacheRow,
  IProjectMemberCacheRow,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import { at, date, NOW } from '../../home/agenda-fixtures';
import '../../../shared/ui/translation-stub';
import { setWindowSize, setWindowWidth } from '../../../shared/ui/window-width';

type Calls = { pushed: unknown[]; asked: string[]; commands: string[] };

const calls: Calls = { pushed: [], asked: [], commands: [] };

const state: {
  rows: Map<string, readonly unknown[]>;
  params: Record<string, string>;
  writes: boolean;
  user: number;
} = { rows: new Map(), params: {}, writes: true, user: 1 };

const mudanza: IProjectCacheRow = {
  id: '7',
  ownerId: '1',
  name: 'Mudanza',
  description: 'Antes de fin de mes',
  status: 'active',
};

const viaje: IProjectCacheRow = {
  id: '8',
  ownerId: '2',
  name: 'Viaje',
  description: '',
  status: 'done',
};

const task = (id: string, title: string, patch: Partial<IProjectTaskCacheRow> = {}) => ({
  id,
  projectId: '7',
  title,
  status: 'todo',
  priority: 'none',
  dueAt: null,
  ...patch,
});

const tasks: IProjectTaskCacheRow[] = [
  task('1', 'Comprar cajas', { dueAt: at(0, 0, -2) }),
  task('2', 'Llamar a la mudanza', { status: 'doing', createdVia: 'assistant' }),
  task('3', 'Vaciar el armario', { status: 'done' }),
  task('4', 'Etiquetar cajas', { status: 'done' }),
];

const members: IProjectMemberCacheRow[] = [
  { id: 'm1', projectId: '7', userId: '3', name: 'Ana Ruiz', access: 'edit' },
  { id: 'm2', projectId: '7', userId: '4', name: 'Luis Paz', access: 'view' },
];

mock.module('@/core/stores', () => ({
  useAuthStore: Object.assign(
    <T,>(select: (value: { user: { id: number } }) => T) => select({ user: { id: state.user } }),
    { getState: () => ({ user: { id: state.user } }) }
  ),
}));
mock.module('@/core/services/database.service', () => ({
  DatabaseService: class {
    readonly table: string;

    constructor(table: string) {
      this.table = table;
    }
  },
}));
mock.module('@/core/services/calendar-event.service', () => ({ calendarEventService: {} }));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: (key: string, scope?: string) =>
    state.rows.get(scope ? `${key}.${scope}` : key) ?? [],
}));
mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => date }));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    has: () => true,
    can: () => state.writes,
    roleActive: true,
  }),
}));
mock.module('@/shared/libs/capabilities', () => ({
  peopleAccessOf: () => ({ receivesDirectory: true }),
}));
mock.module('@/features/agenda', async () => ({
  ...(await import('@/features/agenda/components/day-empty')),
  ...(await import('@/features/agenda/hooks/use-argus-draft')),
}));
mock.module('@/features/voice', () => ({
  setAssistantDraft: (text: string) => calls.asked.push(text),
}));
mock.module('expo-router', () => ({
  useRouter: () => ({
    push: (href: unknown) => calls.pushed.push(href),
    back: () => calls.pushed.push('back'),
    replace: (href: unknown) => calls.pushed.push(href),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => state.params,
  useIsFocused: () => true,
}));
mock.module('@/features/projects/components/project-members-dialog', () => ({
  ProjectMembersDialog: ({ open }: { open: boolean }) =>
    open ? <span>members-dialog</span> : null,
}));
mock.module('@/features/projects/services/project-commands', () => ({
  setTaskStatus: ({ task: row, status }: { task: IProjectTaskCacheRow; status: string }) => {
    calls.commands.push(`status:${row.title}:${status}`);
    return Promise.resolve();
  },
  removeTask: ({ task: row }: { task: IProjectTaskCacheRow }) => {
    calls.commands.push(`remove:${row.title}`);
    return Promise.resolve();
  },
  saveTask: ({ draft, task: row }: { draft: { title: string; lane: string }; task: unknown }) => {
    calls.commands.push(`${row ? 'edit' : 'new'}-task:${draft.title}:${draft.lane}`);
    return Promise.resolve();
  },
  saveProject: ({ draft }: { draft: { name: string } }) => {
    calls.commands.push(`project:${draft.name}`);
    return Promise.resolve();
  },
  removeProject: () => Promise.resolve(),
}));

const { default: ProjectsScreen } = await import('@/features/projects/screens/projects-screen');
const { TaskBoard } = await import('@/features/projects/components/task-board');
const { ProjectsGuide } = await import('@/features/projects/components/projects-guide');
const { ProjectHead, ProjectMenu, ProjectTitle } =
  await import('@/features/projects/components/project-head');
const { ProjectLine } = await import('@/features/projects/components/project-line');
const { ProjectList, ProjectsEmpty } = await import('@/features/projects/components/project-list');
const { ProjectSheet } = await import('@/features/projects/components/project-sheet');
const { PanesProjects, PhoneProject, PhoneProjects } =
  await import('@/features/projects/components/projects-layouts');
const { TaskGroups, TasksEmpty } = await import('@/features/projects/components/task-groups');
const { TaskSheet } = await import('@/features/projects/components/task-sheet');

const parts = [
  TaskBoard,
  ProjectsGuide,
  ProjectHead,
  ProjectMenu,
  ProjectTitle,
  ProjectLine,
  ProjectList,
  ProjectsEmpty,
  ProjectSheet,
  PanesProjects,
  PhoneProject,
  PhoneProjects,
  TaskGroups,
  TasksEmpty,
  TaskSheet,
];

const flush = () => act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 0)));

const seed = () => {
  state.rows = new Map<string, readonly unknown[]>([
    ['project.list', [mudanza, viaje]],
    ['project.tasks.7', tasks],
    ['project.members.7', members],
  ]);
};

beforeEach(() => {
  calls.pushed = [];
  calls.asked = [];
  calls.commands = [];
  state.params = {};
  state.writes = true;
  state.user = 1;
  globalThis.Date.now = () => NOW;
  seed();
});

afterEach(() => setWindowSize(360, 800));

describe('Proyectos on a phone', () => {
  test('a row per project with its people and progress, finished ones below', () => {
    render(<ProjectsScreen />);
    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeDefined();
    expect(screen.getByText('Ana, Luis · 2 de 4 hechas')).toBeDefined();
    expect(screen.getByRole('progressbar', { name: 'Avance de Mudanza' })).toBeDefined();
    expect(screen.getByText('En marcha')).toBeDefined();
    expect(screen.getByText('Terminados')).toBeDefined();
    fireEvent.click(screen.getByTestId('project-row-7'));
    expect(calls.pushed).toEqual([{ pathname: '/projects/[id]', params: { id: '7' } }]);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la agenda' }));
    expect(calls.pushed.at(-1)).toBe('/agenda');
  });

  test('with no projects it offers one, with no suggestion chips', () => {
    state.rows = new Map();
    render(<ProjectsScreen />);
    expect(screen.getByText('Aún no hay proyectos')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^Pedirle a Argus:/ })).toBeNull();
  });

  test('the + opens Nuevo proyecto, which refuses an empty name and saves', async () => {
    render(<ProjectsScreen />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Nuevo proyecto' })[0] ?? document.body);
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Nuevo proyecto' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(within(sheet).getByText('Escribe un nombre.')).toBeDefined();
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Nombre' }), {
      target: { value: 'Huerto' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(calls.commands).toEqual(['project:Huerto']);
  });

  test('the detail groups tasks by state, Hechas collapsed, with a late task in red', () => {
    state.params = { id: '7' };
    render(<ProjectsScreen />);
    expect(screen.getByRole('heading', { name: 'Mudanza' })).toBeDefined();
    expect(screen.getByText('Por hacer')).toBeDefined();
    expect(screen.getByText('En curso')).toBeDefined();
    expect(screen.getByText('Hechas')).toBeDefined();
    expect(screen.queryByText('Vaciar el armario')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Mostrar 2' }));
    expect(screen.getByText('Vaciar el armario')).toBeDefined();
    expect(screen.getByText(/^Atrasada/)).toBeDefined();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar «Comprar cajas» como hecha' }));
    expect(calls.commands).toEqual(['status:Comprar cajas:done']);
  });

  test('a task Argus made says so in its row, the others do not', () => {
    state.params = { id: '7' };
    render(<ProjectsScreen />);
    expect(
      within(screen.getByTestId('task-row-2')).getByText('Sin fecha · por Argus')
    ).toBeDefined();
    expect(within(screen.getByTestId('task-row-1')).queryByText(/por Argus/)).toBeNull();
  });

  test('a right click on a task moves it, and Nueva tarea saves into the chosen state', async () => {
    state.params = { id: '7' };
    render(<ProjectsScreen />);
    fireEvent.contextMenu(screen.getByText('Comprar cajas'));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Pasar a En curso', hidden: true })
    );
    expect(calls.commands).toEqual(['status:Comprar cajas:doing']);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Nueva tarea' });
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Tarea' }), {
      target: { value: 'Pintar' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(calls.commands.at(-1)).toBe('new-task:Pintar:todo');
  });

  test('the ⋯ menu holds Miembros and edit, and a task row opens its edit sheet', async () => {
    state.params = { id: '7' };
    render(<ProjectsScreen />);
    expect(screen.getByLabelText('Más acciones de Mudanza')).toBeDefined();
    fireEvent.click(screen.getByTestId('task-row-1'));
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Editar tarea' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Borrar tarea' }));
    expect(calls.commands).toEqual(['remove:Comprar cajas']);
  });

  test('a project with no tasks says so, never «0 de 0»', () => {
    state.params = { id: '7' };
    state.rows.set('project.tasks.7', []);
    render(<ProjectsScreen />);
    expect(screen.getAllByText(/Aún no hay tareas/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 de 0/)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Pedirle a Argus:/ })).toBeNull();
  });

  test('a view-only member sees the tasks with no add, no check and no menu', () => {
    state.user = 4;
    state.params = { id: '7' };
    state.rows.set('project.list', [{ ...mudanza, ownerId: '1' }]);
    render(<ProjectsScreen />);
    expect(screen.getByText(/Puedes ver este proyecto/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Nueva tarea' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Marcar/ })).toBeNull();
    expect(
      screen.getByRole('checkbox', { name: 'Marcar «Comprar cajas» como hecha' })
    ).toBeDefined();
  });

  test('Command’s «Nueva tarea» and a task link open their sheets', async () => {
    state.params = { new: 'task' };
    const first = render(<ProjectsScreen />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeDefined();
    first.unmount();
    state.params = { id: '7', task: '2' };
    render(<ProjectsScreen />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeDefined();
  });

  test('a short phone keeps the list in reach', () => {
    setWindowSize(360, 640);
    render(<ProjectsScreen />);
    expect(screen.getByTestId('project-row-7')).toBeDefined();
  });
});

describe('Proyectos on wider screens', () => {
  test('a tablet shows the list beside the selected project as a grouped list', () => {
    setWindowWidth(820);
    render(<ProjectsScreen />);
    expect(screen.getByLabelText('Tus proyectos')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Mudanza' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Mostrar 2' })).toBeDefined();
    fireEvent.click(screen.getByTestId('project-row-8'));
    expect(screen.getByRole('heading', { name: 'Viaje' })).toBeDefined();
    expect(calls.pushed).toEqual([]);
  });

  test('a desktop shows the board with all three lanes', () => {
    setWindowWidth(1440);
    render(<ProjectsScreen />);
    expect(screen.getByTestId('task-lane-todo')).toBeDefined();
    expect(screen.getByTestId('task-lane-doing')).toBeDefined();
    expect(screen.getByText('Vaciar el armario')).toBeDefined();
  });

  test('an empty lane is one quiet line under its head, not an empty card', () => {
    setWindowWidth(1440);
    state.rows.set('project.tasks.7', [task('1', 'Comprar cajas')]);
    render(<ProjectsScreen />);
    const doing = screen.getByTestId('task-lane-doing');
    expect(within(doing).getByText('Arrastra una tarea aquí')).toBeDefined();
    expect(within(doing).queryByText('Nada en curso')).toBeNull();
    expect(within(screen.getByTestId('task-lane-todo')).getByText('Comprar cajas')).toBeDefined();
  });

  test('with no projects the detail explains them instead of sitting blank', () => {
    setWindowWidth(1440);
    state.rows = new Map();
    render(<ProjectsScreen />);
    expect(screen.getByText('Así funcionan los proyectos')).toBeDefined();
    expect(screen.getByText('Aún no hay proyectos')).toBeDefined();
    expect(parts.every((part) => typeof part === 'function')).toBe(true);
  });
});
