import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { viewFor } from '@tests/support/access-fixtures';
import type { ReactNode } from 'react';
import type { GuardMode, IncidentResponse } from '@/core/types';
import type { AccessView } from '@/shared/libs/capabilities';
import type { ModuleSurfaces, ResolvedSurfaces } from '@/shared/libs/surfaces';
import type { InicioHero } from '@/features/home/hooks/use-inicio-hero';
import '../../../shared/ui/translation-stub';
import { setWindowWidth } from '../../../shared/ui/window-width';

const launched: string[] = [];

const routes: string[] = [];

const CALM: InicioHero = {
  phase: 'calm',
  tone: 'calm',
  presence: 'idle',
  aura: 'calm',
  greeting: 'Buenas tardes, Ana',
  sentence: 'Todo tranquilo.',
  meta: 'Modo casa · Luis y tú en casa',
  alert: null,
  offlineAge: null,
};

const state = {
  hero: CALM,
  roleActive: true,
  granted: new Set(['agenda.read', 'notifications.read', 'camera.view', 'presence.read']),
  creates: true,
  guardView: true,
  productivity: true,
  summary: {
    camerasTotal: 5,
    camerasOnline: 5,
    projectsActive: 1,
    projectsTotal: 1,
    tasksOpen: 2,
  },
  mode: null as GuardMode | null,
  threads: 1,
};

const marker = (name: string) =>
  function Marker() {
    return <span>{name}</span>;
  };

const registry: {
  modules: readonly ModuleSurfaces[];
  resolve: ((view: AccessView) => ResolvedSurfaces) | null;
} = {
  modules: [],
  resolve: null,
};

function stateView(): AccessView {
  const modules = state.productivity ? ['surveillance', 'productivity'] : ['surveillance'];
  const extra = state.guardView ? ['guard.read'] : [];
  return {
    ...viewFor('owner', { modules }),
    roleActive: state.roleActive,
    capabilities: new Set([...state.granted, ...extra]),
  };
}

mock.module('expo-router', () => ({
  useRouter: () => ({ push: (href: string) => routes.push(href) }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => ({ roleActive: state.roleActive }),
  useCapabilities: () => ({
    has: (capability: string) => state.granted.has(capability),
    can: () => state.creates,
    guard: { view: state.guardView },
    moduleActive: (moduleId: string) => moduleId !== 'productivity' || state.productivity,
  }),
}));

mock.module('@/features/home/hooks/use-inicio-hero', () => ({ useInicioHero: () => state.hero }));

mock.module('@/features/home/hooks/use-inicio-stats', () => ({
  useInicioSummary: () => state.summary,
  useInicioStats: () => [{ value: '5', label: 'cámaras', icon: 'cam' }],
}));

mock.module('@/features/command', () => ({
  useCommandLauncher: () => ({
    open: () => launched.push('search'),
    openNew: () => launched.push('new'),
  }),
}));
mock.module('@/features/home/hooks/use-ask-argus', () => ({
  useAskArgus: () => (draft: string) => launched.push(draft),
}));

mock.module('@/features/home/components/hero/inicio-alert', () => ({
  InicioAlert: ({ response }: { response: IncidentResponse }) => (
    <span>{`alert ${response.id}`}</span>
  ),
}));

mock.module('@/features/security', () => ({ useGuardHeadline: () => state.mode }));

mock.module('@/features/home/hooks/use-news', () => ({
  useNews: () => ({
    readable: state.granted.has('notifications.read'),
    threads: Array.from({ length: state.threads }, (_, index) => ({ key: String(index) })),
  }),
}));

mock.module('@/features/home/components/status/watch-section', () => ({
  WatchSection: marker('watch'),
}));
mock.module('@/features/home/components/status/system-section', () => ({
  SystemSection: marker('system'),
}));
mock.module('@/features/home/components/status/help-section', () => ({
  HelpSection: marker('help'),
}));

mock.module('@/features/safety', () => ({ PanicButton: marker('sos') }));

mock.module('@/features/access', () => ({ InactiveRoleScreen: marker('inactive') }));

mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));

mock.module('@/features/home', () => ({
  NowSection: marker('now'),
  TodaySection: marker('today'),
  TomorrowSection: marker('tomorrow'),
  ProjectsSection: marker('projects'),
  CamerasSection: marker('cameras'),
  HappenedSection: marker('happened'),
  NewsSection: marker('news'),
  HomePeopleSection: marker('people'),
  WatchSection: marker('watch'),
  SystemSection: marker('system'),
  HelpSection: marker('help'),
}));

mock.module('@/features/cameras', () => ({ RecentClipsCard: marker('clips') }));

mock.module('@/features/home/components/hero/module-shortcuts', () => ({
  ModuleShortcuts: () => null,
}));

mock.module('@/shared/libs/surfaces', () => ({
  useSurfaces: () => registry.resolve?.(stateView()),
  SurfaceGroup: ({ children }: { children: ReactNode }) => children,
  SurfaceSlot: ({ children }: { children: ReactNode }) => children,
}));

const { default: HomeScreen } = await import('@/features/home/screens/home-screen');
const { APP_SURFACES } = await import('@/features/surfaces');
const { resolveSurfaces } = await import('@/shared/libs/surfaces/surface-registry');

const order = (names: readonly string[]) =>
  names
    .map((name) => ({ name, node: screen.queryByText(name) }))
    .filter((entry): entry is { name: string; node: HTMLElement } => entry.node !== null)
    .sort((left, right) =>
      left.node.compareDocumentPosition(right.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )
    .map((entry) => entry.name);

const ALL = [
  'watch',
  'now',
  'today',
  'tomorrow',
  'news',
  'cameras',
  'happened',
  'people',
  'projects',
  'clips',
  'system',
  'help',
];

beforeAll(() => {
  registry.resolve = (view) => resolveSurfaces(APP_SURFACES, view);
});

afterEach(() => {
  setWindowWidth(360);
  launched.length = 0;
  routes.length = 0;
  Object.assign(state, {
    hero: CALM,
    roleActive: true,
    creates: true,
    guardView: true,
    productivity: true,
    granted: new Set(['agenda.read', 'notifications.read', 'camera.view', 'presence.read']),
    summary: {
      camerasTotal: 5,
      camerasOnline: 5,
      projectsActive: 1,
      projectsTotal: 1,
      tasksOpen: 2,
    },
    mode: null,
    threads: 1,
  });
});

describe('Inicio on a phone', () => {
  test('the greeting tops the screen, search opens Command, and the hero leads Ahora and Novedades', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Buenas tardes, Ana')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('Modo casa · Luis y tú en casa')).toBeDefined();
    expect(order(ALL)).toEqual(['now', 'cameras', 'clips', 'news']);
    expect(screen.queryByRole('button', { name: /Notificaciones/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar o pedir a Argus' }));
    expect(launched).toEqual(['search']);
  });

  test('a stat opens its screen', () => {
    render(<HomeScreen />);
    expect(screen.getByText('5')).toBeDefined();
  });

  test('before the context arrives the hero and Ahora are skeletons, never an empty agenda', () => {
    state.hero = { ...CALM, phase: 'loading' };
    render(<HomeScreen />);
    expect(screen.getByRole('progressbar', { name: 'Cargando Inicio' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Todo tranquilo.' })).toBeNull();
  });

  test('an alert puts its card under the hero, as an alert', () => {
    state.hero = {
      ...CALM,
      phase: 'alert',
      tone: 'alert',
      presence: 'alert',
      aura: 'alert',
      sentence: 'Alguien en Patio trasero.',
      meta: 'Hace 1 min · Llamando a los avisados…',
      alert: { id: 7 } as IncidentResponse,
    };
    render(<HomeScreen />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('alert 7')).toBeDefined();
  });

  test('offline keeps the last-known facts and says how old they are', () => {
    state.hero = {
      ...CALM,
      phase: 'offline',
      sentence: 'Sin conexión.',
      offlineAge: 'hace 10 min',
    };
    render(<HomeScreen />);
    expect(screen.getByText('Lo último que sé · hace 10 min')).toBeDefined();
    expect(screen.getByText('Sin conexión.')).toBeDefined();
  });

  test('a new household shows one first step, then only sections with content', () => {
    state.summary = {
      camerasTotal: 0,
      camerasOnline: 0,
      projectsActive: 0,
      projectsTotal: 0,
      tasksOpen: 0,
    };
    render(<HomeScreen />);
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(order(ALL)).toEqual(['news', 'system']);
    expect(screen.queryByText('5')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cámara' }));
    expect(routes).toEqual(['/cameras']);
  });

  test('without camera rights the first step asks Argus for the first reminder', () => {
    state.creates = false;
    state.summary = {
      camerasTotal: 0,
      camerasOnline: 0,
      projectsActive: 0,
      projectsTotal: 0,
      tasksOpen: 0,
    };
    state.granted = new Set([...state.granted, 'reminders.write', 'messages.relay']);
    render(<HomeScreen />);
    expect(screen.getByText('Pide tu primer recordatorio')).toBeDefined();
    expect(screen.queryByText('Conecta tu primera cámara')).toBeNull();
  });

  test('a guest without Seguridad holds its SOS on Inicio', () => {
    state.guardView = false;
    state.granted = new Set(['safety.panic', 'notifications.read']);
    render(<HomeScreen />);
    expect(screen.getByText('sos')).toBeDefined();
    expect(order(ALL)).toEqual(['news']);
  });

  test('an inactive role sees the inactive notice', () => {
    state.roleActive = false;
    render(<HomeScreen />);
    expect(screen.getByText('inactive')).toBeDefined();
  });
});

describe('Inicio on a desktop', () => {
  test('at 1280 px the band carries Nuevo over three scrolling columns', () => {
    setWindowWidth(1280);
    render(<HomeScreen />);
    expect(screen.queryByRole('button', { name: 'Buscar o pedir a Argus' })).toBeNull();
    expect(screen.getByLabelText('Tu día')).toBeDefined();
    expect(screen.getByLabelText('Novedades')).toBeDefined();
    expect(screen.getByLabelText('En casa')).toBeDefined();
    expect(order(ALL)).toEqual(['now', 'today', 'tomorrow', 'news', 'cameras', 'people', 'clips']);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo/ }));
    expect(launched).toEqual(['new']);
  });

  test('from 1700 px a fourth column brings Proyectos and Próximos recordatorios', () => {
    setWindowWidth(1920);
    render(<HomeScreen />);
    expect(screen.getByLabelText('Cámaras')).toBeDefined();
    expect(order(ALL)).toEqual(ALL.filter((name) => !['watch', 'help'].includes(name)));
  });
});

describe('Inicio at night, away and with little data', () => {
  test('at night the phone shows «Esta noche» and then Mañana instead of Ahora', () => {
    state.mode = 'night';
    render(<HomeScreen />);
    expect(order(ALL)).toEqual(['watch', 'tomorrow', 'cameras', 'clips', 'news']);
  });

  test('away, the watch leads and Ahora stays', () => {
    state.mode = 'away';
    render(<HomeScreen />);
    expect(order(ALL)).toEqual(['watch', 'now', 'cameras', 'clips', 'news']);
  });

  test('with Productividad off the agenda columns go, live, whatever the role reads', () => {
    setWindowWidth(1280);
    state.productivity = false;
    render(<HomeScreen />);
    expect(order(ALL)).toEqual(['news', 'cameras', 'people', 'clips']);
  });

  test('a sparse home at 1280 px closes the side column with Estado', () => {
    setWindowWidth(1280);
    state.summary = { ...state.summary, projectsActive: 0, tasksOpen: 0 };
    render(<HomeScreen />);
    expect(order(['people', 'system', 'help'])).toEqual(['people', 'system', 'help']);
  });

  test('an empty feed is no blank column', () => {
    setWindowWidth(1280);
    state.threads = 0;
    render(<HomeScreen />);
    expect(screen.queryByLabelText('Novedades')).toBeNull();
    expect(screen.getByLabelText('En casa')).toBeDefined();
  });
});

describe('a new household on a tablet', () => {
  test('fills with how Argus helps and the day', () => {
    setWindowWidth(820);
    state.threads = 0;
    state.summary = {
      camerasTotal: 0,
      camerasOnline: 0,
      projectsActive: 0,
      projectsTotal: 0,
      tasksOpen: 0,
    };
    render(<HomeScreen />);
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(order(ALL)).toEqual(['system', 'help', 'today']);
  });
});
