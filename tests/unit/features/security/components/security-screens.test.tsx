import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { GuardEnvironment, GuardEpisode, GuardMode } from '@/core/types';
import type { useSecurity } from '@/features/security/hooks/use-security';
import type { CameraTiles } from '@/features/security/hooks/use-security-cameras';
import { securityStatus } from '@/features/security/model/security-status';
import { setWindowWidth } from '../../../shared/ui/window-width';
import { NOW, environment, episode, format, guest, maintenanceWindow } from '../security-fixtures';
import { access, calls, data, resetStubs, routes } from './security-stubs';

type Security = ReturnType<typeof useSecurity>;

const HOME = environment();

const SHOP = environment({
  id: 2,
  name: 'Restaurante Centro',
  isDefault: false,
  kind: 'restaurant',
});

let security: Security;

let tiles: CameraTiles;

function episodesOf(rows: GuardEpisode[]) {
  return {
    rows,
    status: 'ready' as const,
    hasMore: false,
    loadMore: async () => calls.push('more') > 0,
    reload: async () => void calls.push('reload'),
    review: async () => true,
    retain: async () => true,
  };
}

function securityOf(overrides: Partial<Security> = {}): Security {
  const environments = overrides.environments ?? [HOME];
  const rows = data.episodes;
  return {
    access: {
      view: true,
      setMode: access.setMode,
      manageGuests: true,
      review: true,
      maintenance: true,
      answerTamper: true,
    },
    scope: { place: environments[0] ?? null, environments, several: environments.length > 1 },
    pick: (pick) => void calls.push(`pick:${String(pick)}`),
    status: securityStatus({
      environments,
      episodes: rows,
      guests: [guest()],
      canReview: true,
      now: NOW,
    }),
    cue: undefined,
    selectedMode: 'home',
    changeMode: access.setMode
      ? async (mode: GuardMode) => void calls.push(`mode:${mode}`)
      : undefined,
    episodes: episodesOf(rows),
    guests: {
      list: [guest()],
      ready: true,
      loadedAt: NOW,
      reload: async () => undefined,
      add: async () => true,
      remove: async () => void calls.push('remove-guest'),
    },
    environments,
    failed: false,
    reload: async () => void calls.push('reload'),
    now: NOW,
    ...overrides,
  };
}

function tilesOf(overrides: Partial<CameraTiles> = {}): CameraTiles {
  return {
    visible: true,
    cameras: [],
    tiles: [
      { id: '3', name: 'Patio trasero', state: 'live', at: null },
      { id: '7', name: 'Dormitorio', state: 'private', at: null },
    ],
    events: [],
    now: NOW,
    format,
    canCreate: true,
    canTalk: true,
    ...overrides,
  };
}

mock.module('@/features/security/hooks/use-security', () => ({ useSecurity: () => security }));
mock.module('@/features/security/hooks/use-security-cameras', () => ({
  useCameraTiles: () => tiles,
  useCameraFrames: () => new Map(),
}));
mock.module('@/features/security/hooks/use-episodes', () => ({
  useEpisodes: () => episodesOf(data.episodes),
}));
mock.module('@/features/security/hooks/use-expected-guests', () => ({
  useExpectedGuests: () => ({
    list: data.guests,
    ready: true,
    loadedAt: NOW,
    reload: async () => undefined,
    add: async () => true,
    remove: async () => void calls.push('remove-guest'),
  }),
}));
mock.module('@/features/security/hooks/use-guard', () => ({
  useGuardEnvironments: () => ({ data: data.environments }),
  useGuard: () => ({
    environments: data.environments,
    createEnvironment: async (body: GuardEnvironment) => ({ ...body, id: 9 }),
  }),
}));

mock.module('@/core/stores', () => ({
  useAuthStore: <T,>(select: (state: { user: { id: number } }) => T) => select({ user: { id: 1 } }),
}));
mock.module('@/features/security/components/environment-form-dialog', () => ({
  EnvironmentFormDialog: () => <span>place-form</span>,
}));
mock.module('@/features/security/components/expected-guest-form', () => ({
  ExpectedGuestForm: () => <span>visit-form</span>,
}));
mock.module('@/features/security/components/maintenance-dialog', () => ({
  MaintenanceDialog: () => <span>maintenance-form</span>,
}));

const { default: SecurityScreen } = await import('@/features/security/screens/security-screen');
const { default: PlacesScreen } = await import('@/features/security/screens/places-screen');
const { default: VisitsScreen } = await import('@/features/security/screens/visits-screen');
const { default: MaintenanceScreen } =
  await import('@/features/security/screens/maintenance-screen');
const { default: EpisodesScreen } = await import('@/features/security/screens/episodes-screen');
const { default: CameraListScreen } =
  await import('@/features/security/screens/camera-list-screen');

afterEach(() => {
  setWindowWidth(360);
  resetStubs();
});

describe('Seguridad', () => {
  test('on a phone: title, SOS, the mode as the hero, its stats, the mode control and the sections', () => {
    data.episodes = [episode({ id: 2, notified: true })];
    security = securityOf();
    tiles = tilesOf();
    render(<SecurityScreen />);
    expect(screen.getByRole('heading', { name: 'Seguridad' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'SOS' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'En casa' })).toBeDefined();
    expect(screen.getByText('Te aviso solo de desconocidos')).toBeDefined();
    expect(screen.getByText('por revisar')).toBeDefined();
    expect(screen.getByText('visita hoy')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: 'Fuera' }));
    expect(calls).toEqual(['mode:away']);
    for (const name of ['Cámaras', 'Lo que pasó', 'Más'])
      expect(screen.getByRole('heading', { name })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Casa' })).toBeNull();
  });

  test('a role that may not change the mode reads it as text, with no control', () => {
    access.setMode = false;
    security = securityOf();
    tiles = tilesOf();
    render(<SecurityScreen />);
    expect(screen.getByRole('heading', { name: 'En casa' })).toBeDefined();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  test('with several places the hero carries the picker, and an alert shows its card', async () => {
    data.episodes = [episode({ id: 6, state: 'active', danger: 'high', notified: true })];
    security = securityOf({ environments: [HOME, SHOP] });
    tiles = tilesOf();
    render(<SecurityScreen />);
    expect(screen.getByRole('button', { name: 'Casa' })).toBeDefined();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Alguien en Patio trasero' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver cámara' }));
    expect(routes).toEqual(['/cameras/3']);
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Revisar' })[0]!);
    });
    expect(screen.getByRole('dialog', { name: 'Persona desconocida' })).toBeDefined();
  });

  test('on desktop the band holds the mode and SOS, and the columns hold cameras and the feed', () => {
    setWindowWidth(1280);
    data.episodes = [episode({ id: 2, notified: true })];
    security = securityOf();
    tiles = tilesOf();
    render(<SecurityScreen />);
    expect(screen.queryByRole('heading', { name: 'Seguridad' })).toBeNull();
    expect(screen.getByRole('button', { name: 'SOS · mantén' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'Modo' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Revisar: Persona desconocida, Patio trasero' })
    ).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Visitas esperadas' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Actividad por cámara · hoy' })).toBeNull();
  });

  test('from 1700 px a third column adds places, maintenance and activity', () => {
    setWindowWidth(1920);
    data.windows = [maintenanceWindow()];
    security = securityOf();
    tiles = tilesOf();
    render(<SecurityScreen />);
    for (const name of ['Lugares', 'Mantenimiento', 'Actividad por cámara · hoy'])
      expect(screen.getByRole('heading', { name })).toBeDefined();
  });

  test('with no data a phone still says the next step, how Argus helps and what to try', () => {
    security = securityOf();
    tiles = tilesOf({ tiles: [] });
    render(<SecurityScreen />);
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Qué hará Argus con tus cámaras' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Prueba esto' })).toBeDefined();
  });

  test('a quiet desktop suggests what to try, and a failed load offers Reintentar', () => {
    setWindowWidth(1280);
    security = securityOf();
    tiles = tilesOf({ tiles: [] });
    const { unmount } = render(<SecurityScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^Pon el modo Noche/ }));
    expect(calls).toEqual(['mode:night']);
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cámara' }));
    expect(screen.getByText('camera-wizard')).toBeDefined();
    unmount();
    setWindowWidth(360);
    security = securityOf({ failed: true });
    render(<SecurityScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(calls).toEqual(['mode:night', 'reload']);
  });
});

describe('the short screens', () => {
  test('Lugares y modos lists each place with its mode and creates a new one', () => {
    data.environments = [HOME, SHOP];
    render(<PlacesScreen />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Restaurante Centro, En casa · sin cámaras' })
    );
    expect(routes).toEqual(['/security/2']);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo lugar' }));
    expect(screen.getByText('place-form')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(routes).toEqual(['/security/2', 'back']);
  });

  test('Visitas esperadas lists who comes until when, and removes one', () => {
    data.guests = [guest({ oneTime: true })];
    render(<VisitsScreen />);
    expect(screen.getByText('Hoy hasta 18:00 · Una vez')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Técnico de internet' }));
    expect(calls).toEqual(['remove-guest']);
  });

  test('with no visit the empty state offers to add one, and a guard only reads it', () => {
    const { unmount } = render(<VisitsScreen />);
    expect(screen.getAllByRole('button', { name: 'Añadir visita' })).toHaveLength(2);
    unmount();
    access.manageGuests = false;
    render(<VisitsScreen />);
    expect(screen.getByText('No esperas a nadie ahora.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Añadir visita' })).toBeNull();
  });

  test('Mantenimiento ends a window and answers the view question', () => {
    data.windows = [
      maintenanceWindow({
        viewChecks: [{ cameraId: 3, cameraName: 'Patio trasero', state: 'pending' }],
      }),
      maintenanceWindow({ id: 5, active: false, endReason: 'expired', duress: true }),
    ];
    render(<MaintenanceScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Ya terminé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, es la nueva vista' }));
    expect(calls).toEqual(['end:4', 'view:3:true']);
    expect(
      screen.getByText('Por Ana · Terminó el tiempo · Declarado bajo coacción: no se silenció nada')
    ).toBeDefined();
  });

  test('with nothing in maintenance the screen says so and offers to start', () => {
    render(<MaintenanceScreen />);
    expect(screen.getByText('Ningún mantenimiento en las últimas 24 horas.')).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Voy a darle mantenimiento' })).toHaveLength(2);
  });

  test('Lo que pasó lists every episode and opens one', async () => {
    data.episodes = [episode({ id: 3 })];
    render(<EpisodesScreen />);
    expect(screen.getByRole('heading', { name: 'Lo que pasó' })).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Persona desconocida$/ }));
    });
    expect(screen.getByRole('dialog', { name: 'Persona desconocida' })).toBeDefined();
  });

  test('the camera list shows every camera, opens one and connects another', () => {
    tiles = tilesOf();
    render(<CameraListScreen />);
    expect(screen.getByText('2 de 2 en línea')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dormitorio, Privada' }));
    expect(routes).toEqual(['/cameras/7']);
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cámara' }));
    expect(screen.getByText('camera-wizard')).toBeDefined();
  });

  test('an empty camera list offers the wizard, or says why to a guard', () => {
    tiles = tilesOf({ tiles: [] });
    const { unmount } = render(<CameraListScreen />);
    expect(screen.getAllByRole('button', { name: 'Conectar cámara' })).toHaveLength(2);
    unmount();
    tiles = tilesOf({ tiles: [], canCreate: false });
    render(<CameraListScreen />);
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Conectar cámara' })).toBeNull();
  });
});
