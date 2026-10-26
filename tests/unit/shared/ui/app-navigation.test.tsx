import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import type { UserRole } from '@/core/types';
import { BottomNavShown } from '@/shared/hooks/use-bottom-nav-inset';
import { viewFor } from '@tests/support/access-fixtures';
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
mock.module('@/shared/hooks/use-cached-rows', () => ({ useViewCacheValue: () => 3 }));
mock.module('@/features/cameras', () => ({ useCameraCounts: () => ({ online: 5, total: 6 }) }));
mock.module('@/features/security', () => ({ useGuardHeadline: () => 'home' }));

const { AppNavigation } = await import('@/features/navigation/components/app-navigation');
const { NavStatusBlock } = await import('@/features/navigation/components/nav-status-block');

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
    <AppNavigation
      voice={{
        onOpenChat: () => void listen.push('chat'),
        onListenStart: () => void listen.push('start'),
        onListenEnd: () => void listen.push('end'),
      }}
      onCommand={() => void commands.push('command')}>
      <Inset />
    </AppNavigation>
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
  test('a phone gets the bar with the tabs the capabilities allow, and the content clears it', () => {
    const listen: string[] = [];
    mount(listen);
    expect(screen.getAllByRole('tab').length).toBe(5);
    expect(screen.getByText('bar-inset')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    fireEvent.click(
      screen.getByRole('tab', { name: 'Argus: toca para escribir, mantén para hablar' })
    );
    expect(route.log).toEqual(['push:/agenda']);
    expect(listen).toEqual(['chat']);
  });

  test('a guest sees three tabs and a pushed child route keeps its tab selected', () => {
    route.role = 'guest';
    route.pathname = '/profile';
    mount();
    expect(screen.getAllByRole('tab').length).toBe(3);
    expect(screen.getByRole('tab', { name: 'Tú' }).getAttribute('aria-selected')).toBe('true');
  });

  test('a full-screen pushed route hides the bar and gives back its inset', () => {
    route.pathname = '/watch';
    mount();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('no-inset')).toBeDefined();
  });

  test('Inicio from another tab dismisses to the root, and the active tab stays put', () => {
    route.pathname = '/agenda';
    route.canDismiss = true;
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Tú' }));
    expect(route.log).toEqual(['dismiss:/', 'replace:/profile']);
  });

  test('a laptop gets the sidebar with the command field, the status block, Ajustes and keys 1 to 5', () => {
    setWindowWidth(1280);
    route.pathname = '/settings/modules';
    const commands: string[] = [];
    mount([], commands);
    expect(screen.getByText('no-inset')).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Ajustes' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Argus de Casa')).toBeDefined();
    expect(screen.getByText('En casa')).toBeDefined();
    expect(screen.getByText('5 de 6')).toBeDefined();
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.getAllByText('3').length).toBe(2);
    expect(screen.getByText('5')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar o pedir…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pregúntale a Argus…' }));
    expect(commands).toEqual(['command', 'command']);
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '4', ctrlKey: true });
    expect(route.log).toEqual(['replace:/security']);
  });

  test('a tablet gets the rail without the sidebar extras', () => {
    setWindowWidth(768);
    mount();
    expect(screen.getAllByRole('tab').length).toBe(5);
    expect(screen.queryByText('Argus de Casa')).toBeNull();
  });

  test('the status block reads the mode and drops the cameras row without camera access', () => {
    route.modules = ['productivity'];
    render(<NavStatusBlock onAsk={() => undefined} />);
    expect(screen.getByText('En casa')).toBeDefined();
    expect(screen.queryByText('5 de 6')).toBeNull();
  });
});
