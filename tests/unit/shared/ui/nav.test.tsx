import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { KeyHint } from '@/shared/ui/nav/key-hint';
import { Nav } from '@/shared/ui/nav/nav';
import { NavBar } from '@/shared/ui/nav/nav-bar';
import { navCollapse, trackCollapse, useNavScrollHandler } from '@/shared/ui/nav/nav-chrome';
import { NavRail } from '@/shared/ui/nav/nav-rail';
import { NavSidebar } from '@/shared/ui/nav/nav-sidebar';
import { NavStatus } from '@/shared/ui/nav/nav-status';
import { ArgusTab, NavTab } from '@/shared/ui/nav/nav-tab';
import type { NavProps } from '@/shared/ui/nav/nav-types';
import { inside, useHoldToTalk } from '@/shared/ui/nav/use-hold-to-talk';
import { setWindowWidth } from './window-width';

const ITEMS = [
  { key: 'home', label: 'Inicio', icon: 'home', shortcut: '1' },
  { key: 'security', label: 'Seguridad', icon: 'shield', shortcut: '2', count: '12' },
  { key: 'argus', label: 'Argus', icon: 'cmd', shortcut: '3', argus: true },
  { key: 'agenda', label: 'Agenda', icon: 'cal', shortcut: '4' },
  { key: 'you', label: 'Tú', icon: 'user', shortcut: '5' },
] as const;

const COPY = {
  navigation: 'Principal',
  argusHint: 'Argus: toca para escribir, mantén para hablar',
  listening: 'Te escucho… suelta para enviar',
  command: 'Buscar o pedir…',
  commandKey: '⌘K',
};

function setup(overrides: Partial<NavProps> = {}) {
  const log: string[] = [];
  const props: NavProps = {
    items: ITEMS,
    active: 'home',
    onSelect: (key) => void log.push(`select:${key}`),
    voice: {
      onOpenChat: () => void log.push('chat'),
      onListenStart: () => void log.push('start'),
      onListenEnd: (send) => void log.push(send ? 'send' : 'cancel'),
    },
    copy: COPY,
    ...overrides,
  };
  return { log, props };
}

afterEach(() => setWindowWidth(360));

describe('Nav', () => {
  test('a phone gets the floating bar with five tabs and the selected one marked', () => {
    const { log, props } = setup();
    render(<Nav {...props} />);
    expect(screen.getByRole('tablist', { name: 'Principal' })).toBeDefined();
    expect(screen.getAllByRole('tab').length).toBe(5);
    expect(screen.getByRole('tab', { name: 'Inicio' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }));
    fireEvent.click(screen.getByRole('tab', { name: COPY.argusHint }));
    expect(log).toEqual(['select:agenda', 'chat']);
  });

  test('a tablet gets the rail, where the centre item opens the chat', () => {
    setWindowWidth(768);
    const { log, props } = setup({
      settings: { key: 'settings', label: 'Ajustes', icon: 'sliders' },
    });
    render(<Nav {...props} />);
    expect(screen.queryByRole('button', { name: COPY.command })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Argus' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Ajustes' }));
    expect(log).toEqual(['chat', 'select:settings']);
  });

  test('a laptop gets the sidebar with the brand, the command field, counts and shortcuts', () => {
    setWindowWidth(1280);
    const commands: string[] = [];
    const { props } = setup({ onCommand: () => void commands.push('palette') });
    render(<Nav {...props} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.command }));
    expect(commands).toEqual(['palette']);
    expect(screen.getByText('⌘K')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getAllByText('Argus').length).toBe(2);
  });

  test('a listening voice lights the edge and shows the listening pill', () => {
    const { props } = setup({ listening: true });
    render(<NavBar {...props} />);
    expect(screen.getByText(COPY.listening)).toBeDefined();
  });

  test('every form renders on its own', () => {
    const { props } = setup();
    for (const Form of [NavBar, NavRail, NavSidebar]) {
      const { unmount } = render(<Form {...props} />);
      expect(screen.getAllByRole('tab').length).toBe(5);
      unmount();
    }
  });

  test('the closing status block lists the server, its rows, the storage and the ask field', () => {
    const asked: string[] = [];
    render(
      <NavStatus
        title="Argus de Casa"
        rows={[
          { icon: 'home', before: 'Modo', strong: 'En casa' },
          { icon: 'cam', strong: '5 de 6', after: 'cámaras activas' },
        ]}
        meter={{ label: 'Almacenamiento', value: '62%', fraction: 0.62 }}
        ask={{ label: 'Pregúntale a Argus…', onPress: () => void asked.push('ask') }}
      />
    );
    expect(screen.getByText('Argus de Casa')).toBeDefined();
    expect(screen.getByText('62%')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Pregúntale a Argus…' }));
    expect(asked).toEqual(['ask']);
  });

  test('a tab and a key hint render alone', () => {
    const picked: string[] = [];
    render(<NavTab item={ITEMS[0]} selected={false} onSelect={(key) => void picked.push(key)} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));
    expect(picked).toEqual(['home']);
    render(<KeyHint label="N" reveal />);
    expect(screen.getByText('N')).toBeDefined();
  });

  test('the Argus tab hands its presses to the hold handlers', () => {
    const calls: string[] = [];
    const handlers = {
      onPressIn: () => void calls.push('in'),
      onLongPress: () => undefined,
      onPressOut: () => void calls.push('out'),
      onPress: () => void calls.push('press'),
      onAccessibilityAction: () => undefined,
    };
    render(
      <ArgusTab
        item={ITEMS[2]}
        selected={false}
        hint={COPY.argusHint}
        listening={false}
        target={{ current: null }}
        handlers={handlers}
        presence={(size, listening) => <>{`${size}-${listening}`}</>}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: COPY.argusHint }));
    expect(calls).toContain('press');
    expect(screen.getByText('36-false')).toBeDefined();
  });

  test('the scroll handler and the collapse value exist for Screen to drive', () => {
    expect(navCollapse.get()).toBe(0);
    expect(typeof renderHook(() => useNavScrollHandler()).result.current).toBe('function');
  });

  test('scrolling down collapses the bar and scrolling up brings it back', () => {
    const track = {};
    trackCollapse(0, track);
    trackCollapse(40, track);
    expect(navCollapse.get()).toBe(1);
    trackCollapse(20, track);
    expect(navCollapse.get()).toBe(0);
    trackCollapse(60, track);
    trackCollapse(0, track);
    expect(navCollapse.get()).toBe(0);
  });
});

describe('hold to talk', () => {
  const voice = (log: string[]) => ({
    onOpenChat: () => void log.push('chat'),
    onListenStart: () => void log.push('start'),
    onListenEnd: (send: boolean) => void log.push(send ? 'send' : 'cancel'),
  });

  const release = (pageX: number) =>
    ({ nativeEvent: { pageX, pageY: 0 } }) as Parameters<
      ReturnType<typeof useHoldToTalk>['handlers']['onPressOut']
    >[0];

  test('holding starts, releasing on the tab sends', () => {
    const log: string[] = [];
    const { result } = renderHook(() => useHoldToTalk(voice(log)));
    act(() => result.current.handlers.onLongPress());
    expect(result.current.mode).toBe('hold');
    act(() => result.current.handlers.onPressOut(release(0)));
    expect(result.current.mode).toBe('off');
    expect(log).toEqual(['start', 'send']);
  });

  test('a tap opens the chat and never listens', () => {
    const log: string[] = [];
    const { result } = renderHook(() => useHoldToTalk(voice(log)));
    act(() => result.current.handlers.onPressOut(release(0)));
    act(() => result.current.handlers.onPress());
    expect(log).toEqual(['chat']);
  });

  test('the accessible alternative is tap to start and tap to stop', () => {
    const log: string[] = [];
    const { result } = renderHook(() => useHoldToTalk(voice(log)));
    act(() => result.current.handlers.onAccessibilityAction());
    expect(result.current.mode).toBe('toggle');
    act(() => result.current.handlers.onPress());
    expect(log).toEqual(['start', 'send']);
  });

  test('a tab that unmounts while listening ends the listening without sending', () => {
    for (const begin of ['onLongPress', 'onAccessibilityAction'] as const) {
      const log: string[] = [];
      const { result, unmount } = renderHook(() => useHoldToTalk(voice(log)));
      act(() => result.current.handlers[begin]());
      unmount();
      expect(log).toEqual(['start', 'cancel']);
    }
    const idle: string[] = [];
    renderHook(() => useHoldToTalk(voice(idle))).unmount();
    expect(idle).toEqual([]);
  });

  test('sliding off the tab cancels', () => {
    const rect = { x: 100, y: 700, width: 62, height: 62 };
    expect(inside(rect, 130, 730)).toBe(true);
    expect(inside(rect, 130, 600)).toBe(false);
    expect(inside(null, 0, 0)).toBe(true);
  });
});
