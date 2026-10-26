import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IncidentResponse } from '@/core/types';
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
  meta: 'En casa · Luis y tú en casa',
  alert: null,
  offlineAge: null,
};

const state = {
  hero: CALM,
  roleActive: true,
  granted: new Set([
    'reminders.read',
    'agenda.read',
    'notifications.read',
    'camera.view',
    'presence.read',
  ]),
  creates: true,
  guardView: true,
  summary: {
    camerasTotal: 5,
    camerasOnline: 5,
    remindersPending: 3,
    projectsActive: 1,
    tasksOpen: 2,
  },
};

const marker = (name: string) => () => <span>{name}</span>;

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

mock.module('@/features/home/components/hero/inicio-alert', () => ({
  InicioAlert: ({ response }: { response: IncidentResponse }) => (
    <span>{`alert ${response.id}`}</span>
  ),
}));

mock.module('@/features/safety', () => ({ PanicButton: marker('sos') }));

mock.module('@/features/access', () => ({ InactiveRoleScreen: marker('inactive') }));

mock.module('@/shared/ui/presence', () => ({ Presence: marker('estela') }));

mock.module('@/features/home/components/agenda/now-section', () => ({ NowSection: marker('now') }));
mock.module('@/features/home/components/agenda/today-section', () => ({
  TodaySection: marker('today'),
}));
mock.module('@/features/home/components/agenda/tomorrow-section', () => ({
  TomorrowSection: marker('tomorrow'),
}));
mock.module('@/features/home/components/agenda/projects-section', () => ({
  ProjectsSection: marker('projects'),
}));
mock.module('@/features/home/components/agenda/upcoming-reminders-section', () => ({
  UpcomingRemindersSection: marker('reminders'),
}));
mock.module('@/features/home/components/feed/news-section', () => ({
  NewsSection: marker('news'),
}));
mock.module('@/features/home/components/feed/home-people-section', () => ({
  HomePeopleSection: marker('people'),
}));

const { default: HomeScreen } = await import('@/features/home/screens/home-screen');

const order = (names: readonly string[]) =>
  names.filter((name) => screen.queryByText(name) !== null);

afterEach(() => {
  setWindowWidth(360);
  launched.length = 0;
  routes.length = 0;
  Object.assign(state, {
    hero: CALM,
    roleActive: true,
    creates: true,
    guardView: true,
    granted: new Set([
      'reminders.read',
      'agenda.read',
      'notifications.read',
      'camera.view',
      'presence.read',
    ]),
    summary: {
      camerasTotal: 5,
      camerasOnline: 5,
      remindersPending: 3,
      projectsActive: 1,
      tasksOpen: 2,
    },
  });
});

describe('Inicio on a phone', () => {
  test('the greeting tops the screen, search opens Command, and the hero leads Ahora and Novedades', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Buenas tardes, Ana')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('En casa · Luis y tú en casa')).toBeDefined();
    expect(order(['now', 'news', 'today', 'people'])).toEqual(['now', 'news']);
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

  test('a new household shows one first step and no empty sections', () => {
    state.summary = {
      camerasTotal: 0,
      camerasOnline: 0,
      remindersPending: 0,
      projectsActive: 0,
      tasksOpen: 0,
    };
    render(<HomeScreen />);
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(order(['now', 'news'])).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cámara' }));
    expect(routes).toEqual(['/cameras']);
  });

  test('without camera rights the first step is the first reminder', () => {
    state.creates = false;
    state.summary = {
      camerasTotal: 0,
      camerasOnline: 0,
      remindersPending: 0,
      projectsActive: 0,
      tasksOpen: 0,
    };
    state.granted = new Set([...state.granted, 'reminders.write']);
    render(<HomeScreen />);
    expect(screen.getByText('Crea tu primer recordatorio')).toBeDefined();
    expect(screen.queryByText('Conecta tu primera cámara')).toBeNull();
  });

  test('a guest without Seguridad holds its SOS on Inicio', () => {
    state.guardView = false;
    state.granted = new Set(['safety.panic', 'notifications.read']);
    render(<HomeScreen />);
    expect(screen.getByText('sos')).toBeDefined();
    expect(order(['now', 'news'])).toEqual(['news']);
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
    expect(order(['now', 'today', 'tomorrow', 'news', 'people', 'projects'])).toEqual([
      'now',
      'today',
      'tomorrow',
      'news',
      'people',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo/ }));
    expect(launched).toEqual(['new']);
  });

  test('from 1700 px a fourth column brings Proyectos and Próximos recordatorios', () => {
    setWindowWidth(1920);
    render(<HomeScreen />);
    expect(screen.getByLabelText('Cámaras')).toBeDefined();
    expect(order(['projects', 'reminders'])).toEqual(['projects', 'reminders']);
  });
});
