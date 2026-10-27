import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import type { AccessView } from '@/shared/libs/capabilities';
import type { HomePerson } from '@/features/home';
import type { Household } from '@/features/profile/hooks/use-household';
import type { ProfileHero } from '@/features/profile/hooks/use-profile-hero';
import type { Week } from '@/features/profile/hooks/use-week';
import { viewFor } from '@tests/support/access-fixtures';
import { setWindowWidth } from '../../shared/ui/window-width';
import '../../shared/ui/translation-stub';

type State = {
  view: AccessView;
  hero: ProfileHero;
  household: Household;
  week: Week;
  pushed: unknown[];
  signedOut: number;
  theme: string;
  reduced: boolean;
  language: string;
};

const person = (patch: Partial<HomePerson>): HomePerson => ({
  id: '1',
  name: 'Ana',
  initial: 'A',
  self: true,
  state: 'home',
  since: new Date(2026, 9, 26, 9, 10),
  ...patch,
});

const hero = (): ProfileHero => ({
  name: 'Ana Ruiz',
  initials: 'AR',
  role: 'Propietario de Casa',
  self: person({}),
  device: 'phone',
  facts: [
    { key: 'people', value: 3, href: '/users' },
    { key: 'cameras', value: 1, href: '/security' },
  ],
  actions: { edit: true, invite: true, qr: true },
});

const household = (patch: Partial<Household> = {}): Household => ({
  people: [person({}), person({ id: '2', name: 'Luis', initial: 'L', self: false, state: 'away' })],
  summary: {
    title: { kind: 'you', others: [] },
    meta: { kind: 'left', name: 'Luis', since: new Date(2026, 9, 26, 9, 10) },
  },
  names: ['Ana', 'Luis'],
  invitations: 0,
  invites: true,
  steps: { pending: ['camera'], done: 1, total: 2, started: true },
  ...patch,
});

const RANGE = { from: new Date(2026, 9, 19), to: new Date(2026, 9, 25) };

const state: State = {
  view: viewFor('owner'),
  hero: hero(),
  household: household(),
  week: { range: RANGE, stats: { done: 2, pending: 1 } },
  pushed: [],
  signedOut: 0,
  theme: 'system',
  reduced: false,
  language: 'es',
};

mock.module('@/features/profile/hooks/use-profile-hero', () => ({
  useProfileHero: () => state.hero,
}));
mock.module('@/features/profile/hooks/use-household', () => ({
  useHousehold: () => state.household,
}));
mock.module('@/features/profile/hooks/use-week', () => ({ useWeek: () => state.week }));
mock.module('@/features/profile/hooks/use-link-meta', () => ({
  useLinkMeta: () => (key: string) => `meta ${key}`,
}));
mock.module('@/features/profile/hooks/use-appearance-line', () => ({
  useAppearanceLine: () => 'Sistema · efectos completos',
}));
mock.module('@/features/sessions', () => ({
  DevicesSection: () => <div>dispositivos</div>,
  useSignOut: () => ({ signOut: async () => void (state.signedOut += 1), signingOut: false }),
}));
mock.module('@/features/activity', () => ({
  RecentActivitySection: ({ fallback }: { fallback: unknown }) => (
    <div>
      <span>lo último</span>
      {fallback as never}
    </div>
  ),
}));
mock.module('@/features/modules', () => ({
  ModuleRequestsSection: () => <div>pedir módulos</div>,
}));
mock.module('@/features/proximity', () => ({ ProximitySection: () => <div>proximidad</div> }));
mock.module('@/features/safety', () => ({ SafetySection: () => <div>seguridad personal</div> }));
mock.module('@/features/voice', () => ({ CallPreferencesSection: () => <div>preferencias</div> }));
mock.module('@/shared/hooks/use-capabilities', () => ({ useAccessView: () => state.view }));
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
mock.module('@/shared/hooks/use-theme-preference', () => ({
  useThemePreference: () => state.theme,
  setThemePreference: (next: string) => void (state.theme = next),
}));
mock.module('@/shared/hooks/use-device-preferences', () => ({
  useDevicePreferences: () => ({
    reduceEffects: state.reduced,
    haptics: true,
    setReduceEffects: (next: boolean) => void (state.reduced = next),
    setHaptics: () => undefined,
  }),
}));
mock.module('@/core/stores', () => ({
  useAuthStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({ user: { id: 1 } }),
  useLocaleStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({
      preference: state.language,
      language: 'es',
      setLanguage: (next: string) => void (state.language = next),
    }),
}));
mock.module('expo-router', () => ({
  useRouter: () => ({
    push: (href: unknown) => state.pushed.push(href),
    back: () => undefined,
    canGoBack: () => true,
    replace: () => undefined,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/profile',
}));

const { default: ProfileScreen } = await import('@/features/profile/screens/profile-screen');
const { AppearanceScreen, LanguageScreen } =
  await import('@/features/profile/screens/appearance-screen');
const { CallsScreen, ModuleRequestsScreen, ProximityScreen, SafetyScreen } =
  await import('@/features/profile/screens/account-screens');
const { HomePanel } = await import('@/features/profile/components/home-panel');
const { ProfileHero: Hero } = await import('@/features/profile/components/profile-hero');
const { heroLookOf } = await import('@/features/profile/model/hero-look');
const { ProfileTabs } = await import('@/features/profile/components/profile-tabs');
const { SubScreen } = await import('@/features/profile/components/sub-screen');
const { WeekPane } = await import('@/features/profile/components/week-pane');

beforeEach(() => {
  setWindowWidth(360);
  Object.assign(state, {
    view: viewFor('owner'),
    hero: hero(),
    household: household(),
    week: { range: RANGE, stats: { done: 2, pending: 1 } },
    pushed: [],
    signedOut: 0,
    theme: 'system',
    reduced: false,
    language: 'es',
  });
});

describe('Tú on a phone', () => {
  test('the hero names the person, says where they are in words and counts the house', () => {
    render(<ProfileScreen />);
    expect(screen.getByRole('heading', { name: 'Ana Ruiz' })).toBeDefined();
    expect(screen.getByText('Propietario de Casa')).toBeDefined();
    expect(screen.getByText(/desde las/)).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: '3 personas' }));
    expect(state.pushed).toEqual(['/users']);
    expect(screen.getByRole('link', { name: '1 cámara' })).toBeDefined();
    expect(screen.queryByText('dispositivos')).toBeNull();
  });

  test('the top bar opens Actividad and Ajustes, and the buttons invite and connect', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conectar otro dispositivo con QR' }));
    expect(state.pushed).toEqual([
      '/settings',
      { pathname: '/users', params: { invite: '1' } },
      '/approve',
    ]);
  });

  test('Casa tells who is home, the real pending step and its rows', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Estás en casa')).toBeDefined();
    expect(screen.getByText(/Luis salió a las/)).toBeDefined();
    expect(screen.getByText('Completa tu casa')).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
    expect(state.pushed).toEqual([{ pathname: '/security', params: {} }]);
    expect(screen.getByText('meta people')).toBeDefined();
  });

  test('Tu cuenta lists the account rows and signs out from a danger row', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tu cuenta' }));
    expect(screen.getByText('Sesiones y dispositivos')).toBeDefined();
    expect(screen.queryByText('Personas')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Cerrar sesión/ }));
    expect(state.signedOut).toBe(1);
  });

  test('a guest without house rows opens on its account', () => {
    state.view = viewFor('guest', { modules: [] });
    state.household = household({
      summary: null,
      invites: false,
      steps: { pending: [], done: 0, total: 0, started: false },
    });
    render(
      <ProfileTabs
        links={{ home: [], account: [{ key: 'sessions', href: '/profile/sessions' }], argus: [] }}
      />
    );
    expect(screen.queryByRole('checkbox', { name: 'Casa' })).toBeNull();
    expect(screen.getByText('Sesiones y dispositivos')).toBeDefined();
  });
});

describe('Tú with panes', () => {
  test('a laptop adds the week and the devices beside the profile', () => {
    setWindowWidth(1440);
    render(<ProfileScreen />);
    expect(screen.getByRole('heading', { name: 'Esta semana' })).toBeDefined();
    expect(screen.getByText('tareas hechas esta semana')).toBeDefined();
    expect(screen.getByText('tarea pendiente esta semana')).toBeDefined();
    expect(screen.getByText('dispositivos')).toBeDefined();
    expect(screen.getByText('lo último')).toBeDefined();
    expect(screen.getByText('Así te ayuda Argus')).toBeDefined();
  });

  test('an empty week explains how Argus helps, with no suggestion chips', () => {
    state.week = { range: RANGE, stats: { done: 0, pending: 0 } };
    render(<WeekPane />);
    expect(screen.getByText('Aquí verás tu semana con Argus')).toBeDefined();
    expect(screen.getByText('Cuida tu casa')).toBeDefined();
    expect(screen.queryByRole('checkbox', { name: '¿Quién está en casa?' })).toBeNull();
  });
});

describe('the Casa panel alone', () => {
  test('alone in Argus says so once and leaves the one Invitar button to the hero', () => {
    state.household = household({
      people: [person({})],
      summary: { title: { kind: 'alone' }, meta: { kind: 'everyone' } },
      names: ['Ana'],
      steps: { pending: ['invite'], done: 0, total: 1, started: false },
    });
    render(<HomePanel household={state.household} peopleHref="/users" />);
    expect(screen.getAllByText('Por ahora vives solo en Argus')).toHaveLength(1);
    expect(screen.getByText('Empieza con Argus')).toBeDefined();
    expect(screen.getByText('Invita a alguien')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Invitar' })).toBeNull();
  });

  test('the hero without facts or actions keeps the name and role only', () => {
    state.hero = {
      ...hero(),
      self: null,
      device: null,
      facts: [],
      actions: { edit: false, invite: false, qr: false },
    };
    render(<Hero look={heroLookOf('regular', false)} />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('the short screens', () => {
  test('Apariencia picks the theme and reduces effects', () => {
    render(<AppearanceScreen />);
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Reducir efectos' }));
    expect(state.theme).toBe('dark');
    expect(state.reduced).toBe(true);
  });

  test('Idioma picks the language of the app', () => {
    render(<LanguageScreen />);
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(state.language).toBe('en');
  });

  test('each account screen carries its title and its section', () => {
    render(
      <>
        <CallsScreen />
        <SafetyScreen />
        <ProximityScreen />
        <ModuleRequestsScreen />
        <SubScreen title="Otra">
          <div>cuerpo</div>
        </SubScreen>
      </>
    );
    expect(screen.getByRole('heading', { name: 'Llamadas de Argus' })).toBeDefined();
    expect(screen.getByText('preferencias')).toBeDefined();
    expect(screen.getByText('seguridad personal')).toBeDefined();
    expect(screen.getByText('proximidad')).toBeDefined();
    expect(screen.getByText('pedir módulos')).toBeDefined();
    expect(screen.getByText('cuerpo')).toBeDefined();
  });
});
