import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GuardMode } from '@/core/types';
import '../../../shared/ui/translation-stub';

const state = {
  mode: 'night' as GuardMode | null,
  guardView: true,
  granted: new Set(['modules.read', 'camera.view']),
  environments: [{ effectiveMode: 'night', cameraIds: [1, 2, 3, 4] }],
  summary: {
    camerasTotal: 6,
    camerasOnline: 5,
    projectsActive: 0,
    tasksOpen: 0,
  },
};

const asked: string[] = [];

const CAMERAS = [
  { id: '1', name: 'Puerta' },
  { id: '2', name: 'Garaje' },
  { id: '3', name: 'Patio trasero' },
  { id: '4', name: 'Sala' },
];

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    has: (capability: string) => state.granted.has(capability),
    guard: { view: state.guardView, setMode: state.granted.has('guard.mode.set') },
    activeModules: new Set(['core', 'surveillance', 'productivity']),
    moduleNames: new Map([
      ['surveillance', 'Vigilancia'],
      ['productivity', 'Productividad'],
    ]),
  }),
}));

mock.module('@/shared/hooks/use-cached-rows', () => ({ useViewCacheRows: () => CAMERAS }));

mock.module('@/features/security', () => ({
  useGuardHeadline: () => state.mode,
  useGuardEnvironments: () => ({ data: state.environments }),
}));

mock.module('@/features/home/hooks/use-ask-argus', () => ({
  useAskArgus: () =>
    state.granted.has('messages.relay') ? (text: string) => asked.push(text) : null,
}));

mock.module('@/features/home/hooks/use-inicio-stats', () => ({
  useInicioSummary: () => state.summary,
}));

const { WatchSection } = await import('@/features/home/components/status/watch-section');
const { SystemSection } = await import('@/features/home/components/status/system-section');
const { HelpSection } = await import('@/features/home/components/status/help-section');
const { TrySection } = await import('@/features/home/components/status/try-section');
const { IdeaChips } = await import('@/features/home/components/agenda/idea-chips');

afterEach(() => {
  asked.length = 0;
  Object.assign(state, {
    mode: 'night',
    guardView: true,
    granted: new Set(['modules.read', 'camera.view']),
    environments: [{ effectiveMode: 'night', cameraIds: [1, 2, 3, 4] }],
  });
});

describe('WatchSection', () => {
  test('at night it says what Argus watches and when it wakes you', () => {
    render(<WatchSection />);
    expect(screen.getByText('Esta noche')).toBeDefined();
    expect(screen.getByText('Vigilo 4 cámaras')).toBeDefined();
    expect(screen.getByText('Puerta, Garaje, Patio trasero y 1 más')).toBeDefined();
    expect(screen.getByText('Te despierto si…')).toBeDefined();
    expect(screen.getByText('Entra alguien desconocido')).toBeDefined();
  });

  test('away it is «Mientras no estás» and tells instead of waking', () => {
    state.mode = 'away';
    state.environments = [{ effectiveMode: 'away', cameraIds: [1] }];
    render(<WatchSection />);
    expect(screen.getByText('Mientras no estás')).toBeDefined();
    expect(screen.getByText('Vigilo una cámara')).toBeDefined();
    expect(screen.getByText('Te aviso si…')).toBeDefined();
  });

  test('at home, with nothing watched or without Seguridad it renders nothing', () => {
    state.mode = 'home';
    const { container, unmount } = render(<WatchSection />);
    expect(container.textContent).toBe('');
    unmount();
    state.mode = 'night';
    state.environments = [{ effectiveMode: 'night', cameraIds: [] }];
    expect(render(<WatchSection />).container.textContent).toBe('');
    state.environments = [{ effectiveMode: 'night', cameraIds: [1] }];
    state.guardView = false;
    expect(render(<WatchSection />).container.textContent).toBe('');
  });
});

describe('SystemSection', () => {
  test('it lists the active modules and the cameras online', () => {
    render(<SystemSection />);
    expect(screen.getByText('Estado')).toBeDefined();
    expect(screen.getByText('Vigilancia y Productividad activos')).toBeDefined();
    expect(screen.getByText('5 de 6 en línea')).toBeDefined();
  });

  test('without the rights to read either, it renders nothing', () => {
    state.granted = new Set();
    expect(render(<SystemSection />).container.textContent).toBe('');
  });
});

describe('HelpSection', () => {
  test('it says how Argus helps, one row per right the reader has', () => {
    state.granted = new Set(['camera.view', 'reminders.read', 'assistant.voice']);
    render(<HelpSection />);
    expect(screen.getByText('Así te ayuda Argus')).toBeDefined();
    expect(screen.getByText('Cuida tu casa')).toBeDefined();
    expect(screen.getByText('Te recuerda lo importante')).toBeDefined();
    expect(screen.getByText('Te responde cuando le hablas')).toBeDefined();
  });

  test('with none of those rights it renders nothing', () => {
    state.granted = new Set();
    expect(render(<HelpSection />).container.textContent).toBe('');
  });
});

describe('TrySection and its chips', () => {
  test('each chip asks Argus its words', () => {
    state.granted = new Set(['messages.relay', 'presence.read', 'guard.mode.set']);
    render(<TrySection />);
    expect(screen.getByText('Prueba a decirle')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Pedirle a Argus: Pon el modo Noche' }));
    expect(asked).toEqual(['Pon el modo Noche']);
  });

  test('without the ask path it renders nothing', () => {
    state.granted = new Set(['presence.read']);
    expect(render(<TrySection />).container.textContent).toBe('');
  });

  test('the chips quote the words they send', () => {
    render(<IdeaChips ideas={['¿Qué tengo hoy?']} ask={(text) => asked.push(text)} />);
    expect(screen.getByText('«¿Qué tengo hoy?»')).toBeDefined();
  });
});
