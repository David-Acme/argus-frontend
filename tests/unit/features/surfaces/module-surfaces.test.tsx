import { describe, expect, mock, test } from 'bun:test';
import { viewFor } from '@tests/support/access-fixtures';
import type { UserRole } from '@/core/types';
import type { AccessView } from '@/shared/libs/capabilities';
import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import '../../shared/ui/translation-stub';

const Section = () => null;

mock.module('@/features/home', () => ({
  NowSection: Section,
  ProjectsSection: Section,
  TodaySection: Section,
  TomorrowSection: Section,
  CamerasSection: Section,
  HappenedSection: Section,
  HomePeopleSection: Section,
  NewsSection: Section,
  HelpSection: Section,
  SystemSection: Section,
  WatchSection: Section,
  AttentionSection: Section,
  ModuleCards: Section,
}));

mock.module('@/features/cameras', () => ({
  RecentClipsCard: Section,
  CameraAttention: () => null,
  SecurityCard: () => null,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => viewFor('owner'),
  useCapabilities: () => ({}),
}));

const { registryProblems, resolveSurfaces } = await import('@/shared/libs/surfaces');

const { APP_SURFACES } = await import('@/features/surfaces');
const { inicioColumns, inicioStack } = await import('@/features/home/model/inicio-layout');
const { barEntries, navGroups, railEntries, ALL_KEY, MENU_KEY } =
  await import('@/features/navigation/model/nav-model');

const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

const FAKE_COUNT = 8;

const Nothing = () => null;

const fakeModule = (index: number): ModuleSurfaces => ({
  module: `fake-${index}`,
  order: 100 + index,
  hub: { label: 'screens.navigation.modules', icon: 'grid', href: '/' },
  destinations: [
    {
      id: `fake-${index}-home`,
      href: '/',
      icon: 'grid',
      label: 'screens.navigation.modules',
      order: 100 + index,
    },
  ],
  inicio: [
    {
      id: `fake-${index}-card`,
      label: 'screens.home.inicio.sections.modules',
      render: Nothing,
      places: {
        stack: { order: 200 + index },
        band: { order: 200 + index, column: 'side' },
        wide: { order: 200 + index, column: 'side' },
      },
    },
  ],
});

const FAKES = Array.from({ length: FAKE_COUNT }, (_, index) => fakeModule(index));

const FAKE_IDS = FAKES.map((module) => module.module);

type Case = { label: string; modules: readonly string[]; fakes: boolean };

const CASES: readonly Case[] = [
  { label: '0 modules', modules: [], fakes: false },
  { label: '1 module (surveillance)', modules: ['surveillance'], fakes: false },
  { label: '1 module (productivity)', modules: ['productivity'], fakes: false },
  { label: '2 modules', modules: ['surveillance', 'productivity'], fakes: false },
  { label: '10 modules', modules: ['surveillance', 'productivity'], fakes: true },
];

const SIGNALS = new Set(['news', 'tiles', 'day', 'sparse']);

function viewOf(role: UserRole, item: Case, roleActive: boolean): AccessView {
  const view = viewFor(role, { modules: item.modules, roleActive });
  return item.fakes
    ? { ...view, activeModules: new Set([...view.activeModules, ...FAKE_IDS]) }
    : view;
}

const registryOf = (item: Case) => (item.fakes ? [...APP_SURFACES, ...FAKES] : APP_SURFACES);

describe('the module registry', () => {
  test('ships no conflict: no id twice, one growing section per column, every column placed', () => {
    expect(registryProblems(APP_SURFACES)).toEqual([]);
    expect(registryProblems([...APP_SURFACES, ...FAKES])).toEqual([]);
  });

  test('a duplicate is reported and the module with the lower order wins', () => {
    const twin: ModuleSurfaces = { ...fakeModule(0), module: 'twin', order: 999 };
    expect(registryProblems([fakeModule(0), twin])).toContain(
      'inicio:fake-0-card is contributed twice'
    );
  });
});

for (const role of ROLES)
  for (const roleActive of [true, false])
    describe(`${role}, ${roleActive ? 'active' : 'inactive'}`, () => {
      for (const item of CASES)
        test(`${item.label}: every surface adds or leaves cleanly`, () => {
          const view = viewOf(role, item, roleActive);
          const resolved = resolveSurfaces(registryOf(item), view);
          const active = view.roleActive;
          const modules = resolved.modules.map((module) => module.module);

          if (!active) expect(modules.filter((id) => !FAKE_IDS.includes(id))).toEqual([]);
          for (const module of resolved.modules)
            expect(view.activeModules.has(module.module)).toBe(true);

          const bar = barEntries(resolved, { bar: [], quick: [] });
          expect(bar.length).toBeGreaterThanOrEqual(2);
          expect(bar.length).toBeLessThanOrEqual(5);
          expect(bar[0]?.key).toBe('home');
          expect(bar.at(-1)?.key).toBe(ALL_KEY);
          const argus = bar.findIndex((entry) => entry.argus);
          if (argus >= 0) expect(argus).toBe(modules.length === 0 ? 1 : 2);

          const rail = railEntries(resolved, { bar: [], quick: [] });
          expect(rail[0]?.key).toBe(MENU_KEY);
          expect(rail.length).toBeLessThanOrEqual(7);

          const groups = navGroups(resolved, { bar: [], quick: [] });
          expect(groups.modules.length).toBe(resolved.modules.length);
          for (const entry of groups.modules)
            expect(entry.children?.length ?? 0).toBeGreaterThan(0);

          for (const place of ['band', 'wide'] as const) {
            const columns = inicioColumns(place, resolved.inicio, SIGNALS);
            expect(columns[0]?.sections[0]).toBe('lead');
            for (const column of columns) {
              expect(column.sections.length).toBeGreaterThan(0);
              expect(column.grows).toBeLessThan(column.sections.length);
            }
            const ids = columns.flatMap((column) => column.sections);
            expect(new Set(ids).size).toBe(ids.length);
          }
          const stack = inicioStack(resolved.inicio, SIGNALS, false);
          expect(stack[0]).toBe('lead');
          expect(new Set(stack).size).toBe(stack.length);
        });
    });

describe('what each role is offered', () => {
  test('the owner with both modules: Seguridad and Agenda in the bar, Clips under Seguridad', () => {
    const resolved = resolveSurfaces(APP_SURFACES, viewFor('owner'));
    expect(barEntries(resolved, { bar: [], quick: [] }).map((entry) => entry.key)).toEqual([
      'home',
      'module:surveillance',
      'argus',
      'module:productivity',
      ALL_KEY,
    ]);
    const security = navGroups(resolved, { bar: [], quick: [] }).modules[0];
    expect(security?.children?.map((entry) => entry.key)).toContain('clips');
    expect(resolved.inicio.map((surface) => surface.id)).toContain('clips');
  });

  test('a pinned module takes the first slot, and a pin of a module that is off falls through', () => {
    const resolved = resolveSurfaces(APP_SURFACES, viewFor('owner'));
    const pinned = barEntries(resolved, { bar: ['productivity'], quick: [] });
    expect(pinned[1]?.key).toBe('module:productivity');
    const off = resolveSurfaces(APP_SURFACES, viewFor('owner', { modules: ['surveillance'] }));
    expect(barEntries(off, { bar: ['productivity'], quick: [] })[1]?.key).toBe(
      'module:surveillance'
    );
  });

  test('a resident reads no clips, so Clips is absent everywhere', () => {
    const resolved = resolveSurfaces(APP_SURFACES, viewFor('resident'));
    expect(resolved.destinations.map((entry) => entry.id)).not.toContain('clips');
    expect(resolved.inicio.map((surface) => surface.id)).not.toContain('clips');
  });

  test('a guest keeps a calm Inicio: the lead and what it may read, nothing of the modules it lacks', () => {
    const resolved = resolveSurfaces(APP_SURFACES, viewFor('guest'));
    expect(resolved.modules.map((module) => module.module)).toEqual([]);
    expect(inicioStack(resolved.inicio, SIGNALS, false)).toEqual([
      'lead',
      'attention',
      'cameras',
      'news',
      'modules',
    ]);
  });

  test('an inactive guard keeps the baseline: no module, no module section, no module search', () => {
    const view = viewFor('guard', { modules: ['productivity'] });
    const resolved = resolveSurfaces(APP_SURFACES, view);
    expect(resolved.modules).toEqual([]);
    expect(resolved.search.has('camera')).toBe(false);
    expect(inicioColumns('wide', resolved.inicio, SIGNALS)[0]?.sections[0]).toBe('lead');
  });
});
