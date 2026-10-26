import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { View } from 'react-native';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { aimControls, calls, cameraRow, ptzControls } from './camera-fixtures';

const pushed: string[] = [];

const applied: unknown[] = [];

function settingsOf(overrides: Partial<CameraSettings> = {}): CameraSettings {
  return {
    camera: cameraRow(),
    features: {
      ptz: true,
      presets: true,
      privacy: true,
      motion: true,
      autoTrack: true,
      led: true,
      dayNight: true,
    },
    device: {
      model: 'Tapo C210',
      firmware: '1.3.2',
      privacyEnabled: false,
      motionEnabled: true,
      motionSensitivity: 50,
      autoTrackEnabled: false,
      ledEnabled: true,
      dayNightMode: 'auto',
    },
    deviceFailed: false,
    recheck: async () => {
      calls.push('recheck');
    },
    deviceSettings: {
      apply: async (body) => {
        applied.push(body);
      },
      busy: false,
      privacyBusy: false,
    },
    aim: aimControls(),
    patrol: {
      patrol: {
        cameraId: 3,
        stops: ['1', '2'],
        dwellSeconds: 30,
        window: null,
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
      },
      loaded: true,
      failed: false,
      save: async (patch) => {
        applied.push(patch);
        return true;
      },
      remove: async () => {
        calls.push('remove-patrol');
        return true;
      },
    },
    presets: {
      presets: [
        { id: '1', name: 'Entrada' },
        { id: '2', name: 'Patio' },
      ],
      goto: () => undefined,
      goHome: () => undefined,
      save: async () => undefined,
      setHome: async (preset) => {
        calls.push(`home:${preset.id}`);
      },
    },
    listening: 'listening',
    sections: [
      'privacy',
      'detection',
      'listen',
      'gaze',
      'patrol',
      'places',
      'maintenance',
      'device',
      'advanced',
    ],
    access: { update: true, remove: true, managePresets: true },
    ...overrides,
  };
}

let settings: CameraSettings | null = settingsOf();

mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <span data-testid="redirect">{href}</span>,
  useLocalSearchParams: () => ({ id: '3' }),
  useRouter: () => ({
    push: (href: string) => pushed.push(href),
    back: () => pushed.push('back'),
    canGoBack: () => true,
    replace: (href: string) => pushed.push(href),
  }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/cameras/hooks/use-camera-settings', () => ({
  useCameraSettings: () => settings,
}));

mock.module('@/features/cameras/hooks/use-camera-live', () => ({
  useCameraRow: () => settings?.camera ?? null,
}));

mock.module('@/features/security', () => ({
  MaintenancePanel: () => <span>Ventanas de mantenimiento</span>,
  useCameraEnvironmentIndex: () =>
    new Map([['3', { environmentId: 1, name: 'Casa', kind: 'home' }]]),
}));

mock.module('@/features/cameras/components/camera-form', () => ({ CameraForm: () => null }));

mock.module('@/features/cameras/components/players', () => ({
  CameraLiveView: () => <span data-testid="player" />,
  ClipPlayer: () => null,
}));

mock.module('@/features/cameras/hooks/use-camera-ptz', () => ({ useCameraPtz: () => ptzControls }));

mock.module('@/features/cameras/hooks/use-camera-aim', () => ({ useViewerLease: () => undefined }));

mock.module('@/core/services/camera.service', () => ({
  cameraService: { update: async () => ({ ok: true }) },
}));

mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: async (action: { intents?: { values?: unknown }[] }) => {
    applied.push(action.intents?.[0]?.values ?? 'optimistic');
    return null;
  },
}));

mock.module('react-native-safe-area-context', () => ({
  SafeAreaView: View,
  SafeAreaInsetsContext: { Provider: View, Consumer: View },
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const { default: CameraSettingsScreen } =
  await import('@/features/cameras/screens/camera-settings-screen');
const { PrivacySection } = await import('@/features/cameras/components/settings/privacy-section');
const { ListenSection } = await import('@/features/cameras/components/settings/listen-section');
const { GazeSection } = await import('@/features/cameras/components/settings/gaze-section');
const { PatrolSection } = await import('@/features/cameras/components/settings/patrol-section');
const { PatrolSheet } = await import('@/features/cameras/components/settings/patrol-sheet');
const { PlacesSection } = await import('@/features/cameras/components/settings/places-section');
const { SectorSheet } = await import('@/features/cameras/components/settings/sector-sheet');
const { DetectionSection } =
  await import('@/features/cameras/components/settings/detection-section');
const { DeviceSection } = await import('@/features/cameras/components/settings/device-section');
const { AdvancedSection } = await import('@/features/cameras/components/settings/advanced-section');
const { ChoiceRow } = await import('@/features/cameras/components/settings/choice-row');

afterEach(() => {
  calls.length = 0;
  pushed.length = 0;
  applied.length = 0;
  settings = settingsOf();
});

describe('Ajustes de la cámara', () => {
  test('is its own screen of sections, in the spec order', () => {
    render(<CameraSettingsScreen />);
    expect(screen.getByRole('heading', { name: 'Ajustes de la cámara' })).toBeDefined();
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Privacidad',
      'Detección y sensibilidad',
      'Argus escucha aquí',
      'Mirada activa',
      'Ronda programada',
      'Lugares donde no mirar',
      'Dispositivo',
      'Opciones avanzadas',
    ]);
    expect(screen.getByText('Ventanas de mantenimiento')).toBeDefined();
  });

  test('a camera that is gone redirects to the list', () => {
    settings = null;
    render(<CameraSettingsScreen />);
    expect(screen.getByTestId('redirect').textContent).toBe('/cameras');
  });
});

describe('privacy', () => {
  test('a known state is a switch that asks before masking', async () => {
    render(<PrivacySection settings={settingsOf()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Modo privacidad' }));
    });
    expect(applied).toEqual([{ privacy: true }]);
  });

  test('an unknown state offers to read it again instead of a switch', () => {
    render(<PrivacySection settings={settingsOf({ device: null })} />);
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a leer' }));
    expect(calls).toEqual(['recheck']);
  });
});

describe('listening', () => {
  test('no Escuchar switch under a state that says it does not listen', () => {
    render(<ListenSection settings={settingsOf({ listening: 'masked' })} />);
    expect(screen.getByText('No escucha: la lente está tapada')).toBeDefined();
    expect(screen.queryByRole('switch', { name: 'Escuchar en esta cámara' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Sin audio (zona de descanso)' })).toBeDefined();
  });

  test('a listening camera can stop listening, saved optimistically', () => {
    render(<ListenSection settings={settingsOf()} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Escuchar en esta cámara' }));
    expect(applied).toEqual([{ watchman: false }]);
  });

  test('a role that cannot change the camera reads the state only', () => {
    render(
      <ListenSection
        settings={settingsOf({ access: { update: false, remove: false, managePresets: false } })}
      />
    );
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('gaze, patrol and places', () => {
  test('without a watch position the active look explains itself and offers no switch', () => {
    render(<GazeSection settings={settingsOf({ aim: aimControls({ homePreset: null }) })} />);
    expect(
      screen.getByText('Primero fija una posición de vigilancia: Argus siempre vuelve a ella.')
    ).toBeDefined();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('the watch position is picked from a list of saved positions', () => {
    render(<GazeSection settings={settingsOf()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Posición de vigilancia, Entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Patio' }));
    expect(calls).toEqual(['home:2']);
  });

  test('the patrol summary reads its route and can be paused or removed', () => {
    render(<PatrolSection settings={settingsOf()} />);
    expect(screen.getByText('Entrada → Patio')).toBeDefined();
    fireEvent.click(screen.getByRole('switch', { name: 'Ronda activa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar ronda' }));
    expect(applied).toEqual([{ enabled: false }]);
    expect(calls).toEqual(['remove-patrol']);
  });

  test('without enough positions a patrol cannot be created and says why', () => {
    const base = settingsOf();
    render(
      <PatrolSection
        settings={{
          ...base,
          patrol: { ...base.patrol, patrol: null },
          presets: { ...base.presets, presets: [{ id: '1', name: 'Entrada' }] },
        }}
      />
    );
    expect(
      screen.getByText('Guarda al menos dos posiciones de la cámara para armar una ronda.')
    ).toBeDefined();
  });

  test('the patrol sheet adds stops from the saved positions and refuses a bad wait', async () => {
    let closed = 0;
    const saved: unknown[] = [];
    render(
      <PatrolSheet
        patrol={null}
        presets={settingsOf().presets.presets}
        onClose={() => (closed += 1)}
        onSave={async (patch) => {
          saved.push(patch);
          return true;
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Patio' }));
    expect(screen.getByRole('button', { name: 'Quitar Entrada de la ronda' })).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar ronda' }));
    });
    expect(saved).toHaveLength(1);
    expect(closed).toBe(1);
  });

  test('places list what Argus never looks at, and a full list says so', () => {
    const sector = { name: 'Ventana del vecino', panFrom: 10, panTo: 20, tiltFrom: -5, tiltTo: 5 };
    render(
      <PlacesSection
        settings={settingsOf({
          aim: aimControls({
            settings: { activeLook: false, followIntruders: false, noAimSectors: [sector] },
          }),
        })}
      />
    );
    expect(screen.getByText('Ventana del vecino')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Quitar el lugar Ventana del vecino' })
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Añadir lugar/ }));
    expect(screen.getByTestId('player')).toBeDefined();
  });

  test('a new place is marked from the live picture, then named', async () => {
    render(
      <SectorSheet cameraId="3" aim={aimControls()} holdRenewMs={null} onClose={() => undefined} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar inicio' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar fin' }));
    });
    expect(screen.getAllByText('Giro 10° · Inclinación -5°')).toHaveLength(2);
    expect(screen.getByLabelText('Nombre de la zona')).toBeDefined();
  });
});

describe('detection, device and advanced', () => {
  test('motion shows its sensitivity while it is on', () => {
    render(<DetectionSection settings={settingsOf()} />);
    expect(screen.getByRole('switch', { name: 'Detección de movimiento' })).toBeDefined();
    expect(screen.getByText('Sensibilidad')).toBeDefined();
  });

  test('the device lists its facts and opens its place', () => {
    render(<DeviceSection settings={settingsOf()} />);
    expect(screen.getByText('Tapo C210')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Lugar, Casa' }));
    expect(pushed).toEqual(['/security/1']);
  });

  test('advanced turns the camera off and deletes it', async () => {
    render(<AdvancedSection settings={settingsOf()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Desactivar cámara/ }));
    });
    expect(applied).toEqual([{ isEnabled: false }]);
    expect(screen.getByRole('button', { name: 'Eliminar cámara' })).toBeDefined();
  });

  test('a choice row carries its label over the control', () => {
    render(
      <ChoiceRow
        label="Visión nocturna"
        options={[
          { value: 'auto', label: 'Automática' },
          { value: 'day', label: 'Día' },
        ]}
        value="auto"
        onChange={() => undefined}
      />
    );
    expect(screen.getByText('Visión nocturna')).toBeDefined();
  });
});
