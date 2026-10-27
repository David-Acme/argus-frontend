import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { viewFor } from '@tests/support/access-fixtures';
import type { UserRole } from '@/core/types';
import { BottomNavShown } from '@/shared/hooks/use-bottom-nav-inset';
import { screenFocus } from './screen-focus';
import './translation-stub';

const route = {
  pathname: '/',
  canDismiss: false,
  role: 'owner' as UserRole,
  modules: ['surveillance', 'productivity'],
  log: [] as string[],
};

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => route.pathname,
  useRouter: () => ({
    push: (href: string) => void route.log.push(`push:${href}`),
    replace: (href: string) => void route.log.push(`replace:${href}`),
    canDismiss: () => route.canDismiss,
    dismissTo: (href: string) => void route.log.push(`dismiss:${href}`),
    setParams: () => undefined,
  }),
  useIsFocused: () => screenFocus.focused,
  useFocusEffect: () => undefined,
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => viewFor(route.role, { modules: route.modules }),
  useCapabilities: () => {
    const view = viewFor(route.role, { modules: route.modules });
    return {
      ...view,
      has: (capability: string) => view.capabilities.has(capability),
      guard: { view: true },
    };
  },
}));
mock.module(
  '@/features/navigation/hooks/use-section-keys',
  () => import('@/features/navigation/hooks/use-section-keys.web')
);
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheValue: (key: string) => (key === 'dashboard.unread' ? 3 : null),
}));
mock.module('@/features/cameras', () => ({
  useCameraCounts: () => ({ online: 5, total: 6 }),
  RecentClipsCard: () => null,
}));
mock.module('@/features/home', () => {
  const Section = () => null;
  return {
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
  };
});
mock.module('@/features/security', () => ({ useGuardHeadline: () => 'home' }));

const { AppNavigation } = await import('@/features/navigation/components/app-navigation');
const { NavStatusBlock } = await import('@/features/navigation/components/nav-status-block');
const { APP_SURFACES } = await import('@/features/surfaces');
const { SurfaceProvider } = await import('@/shared/libs/surfaces');

function setWindowWidth(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => 800,
  });
  act(() => {
    globalThis.dispatchEvent(new Event('resize'));
  });
}

function Inset() {
  return <>{useContext(BottomNavShown) ? 'bar-inset' : 'no-inset'}</>;
}

function mount(listen: string[] = [], commands: string[] = []) {
  return render(
    <SurfaceProvider registry={APP_SURFACES}>
      <AppNavigation
        voice={{
          onOpenChat: () => void listen.push('chat'),
          onListenStart: () => void listen.push('start'),
          onListenEnd: () => void listen.push('end'),
        }}
        onCommand={() => void commands.push('command')}>
        <Inset />
      </AppNavigation>
    </SurfaceProvider>
  );
}

afterEach(() => {
  setWindowWidth(360);
  route.pathname = '/';
  route.canDismiss = false;
  route.role = 'owner';
  route.modules = ['surveillance', 'productivity'];
  route.log = [];
});

describe('AppNavigation', () => {
  test('a phone: Inicio, two modules, Argus in the centre, Todo; the content clears the bar', () => {
    const listen: string[] = [];
    mount(listen);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'));
    expect(tabs).toEqual([
      'Inicio',
      'Seguridad',
      'Argus: toca para escribir, mantén para hablar',
      'Agenda',
      'Todo',
    ]);
    expect(screen.getByText('bar-inset')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    fireEvent.click(
      screen.getByRole('tab', { name: 'Argus: toca para escribir, mantén para hablar' })
    );
    expect(route.log).toEqual(['push:/agenda']);
    expect(listen).toEqual(['chat']);
  });

  test('a guest has no module: Inicio, Argus, Todo, and a profile route lights Todo', () => {
    route.role = 'guest';
    route.pathname = '/profile';
    mount();
    expect(screen.getAllByRole('tab').length).toBe(3);
    expect(screen.getByRole('tab', { name: 'Todo' }).getAttribute('aria-selected')).toBe('true');
  });

  test('one module keeps four even slots: Inicio, it, Argus, Todo', () => {
    route.modules = ['productivity'];
    mount();
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'Inicio',
      'Agenda',
      'Argus: toca para escribir, mantén para hablar',
      'Todo',
    ]);
  });

  test('a full-screen pushed route hides the bar and gives back its inset', () => {
    route.pathname = '/watch';
    mount();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('no-inset')).toBeDefined();
  });

  test('Inicio from a module dismisses to the root, and the active module stays put', () => {
    route.pathname = '/agenda';
    route.canDismiss = true;
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    expect(route.log).toEqual(['dismiss:/']);
  });

  test('a laptop: the core, the Módulos group with its sections, the account, the status and keys', () => {
    setWindowWidth(1280);
    route.pathname = '/settings/modules';
    const commands: string[] = [];
    mount([], commands);
    expect(screen.getByText('no-inset')).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Ajustes' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Módulos')).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Seguridad' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Tú' })).toBeDefined();
    expect(screen.getByText('Argus de Casa')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar o pedir…' }));
    expect(commands).toEqual(['command']);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los apartados de Seguridad' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Clips' }));
    expect(route.log).toEqual(['replace:/clips']);
  });

  test('a guest on a laptop has no empty Módulos group', () => {
    setWindowWidth(1280);
    route.role = 'guest';
    mount();
    expect(screen.queryByText('Módulos')).toBeNull();
  });

  test('a tablet folds the list into a rail that unfolds in place', () => {
    setWindowWidth(768);
    mount();
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'Menú',
      'Inicio',
      'Argus',
      'Seguridad',
      'Agenda',
      'Todo',
      'Tú',
    ]);
    expect(screen.queryByText('Argus de Casa')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Menú' }));
    expect(screen.getByText('Módulos')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Plegar el menú' }));
    expect(screen.queryByText('Módulos')).toBeNull();
  });

  test('the status block reads the mode and drops the cameras row without camera access', () => {
    route.modules = ['productivity'];
    render(<NavStatusBlock onAsk={() => undefined} />);
    expect(screen.getByText('En casa')).toBeDefined();
    expect(screen.queryByText('5 de 6')).toBeNull();
  });
});
