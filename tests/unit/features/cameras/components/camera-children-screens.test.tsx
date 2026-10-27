import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ICameraCacheRow, ICameraClip, ICameraRecordingState } from '@/core/interfaces';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { calls, cameraRow } from './camera-fixtures';

const pushed: string[] = [];

const actions: { call: () => Promise<unknown> }[] = [];

let camera: ICameraCacheRow | null = cameraRow();

let recording: ICameraRecordingState | null = null;

let playback: ClipPlayback;

const clip: ICameraClip = {
  id: '9',
  cameraId: '3',
  trigger: 'event',
  contentType: 'video/mp4',
  codec: 'h264',
  startedAt: 1_790_000_000,
  durationMs: 12_000,
  byteSize: 2_000_000,
  createdAt: 0,
  expiresAt: 0,
};

function playbackOf(overrides: Partial<ClipPlayback> = {}): ClipPlayback {
  return {
    state: 'idle',
    clip: null,
    file: null,
    image: null,
    open: (opened) => calls.push(`open:${opened.id}`),
    replay: () => calls.push('replay'),
    close: () => calls.push('close'),
    ...overrides,
  };
}

mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: string | { pathname: string } }) => (
    <span data-testid="redirect">{typeof href === 'string' ? href : href.pathname}</span>
  ),
  useLocalSearchParams: () => ({ id: '3' }),
  useRouter: () => ({
    push: (href: string) => pushed.push(href),
    back: () => pushed.push('back'),
    canGoBack: () => true,
    replace: (href: string) => pushed.push(href),
  }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/cameras/hooks/use-camera-live', () => ({ useCameraRow: () => camera }));

mock.module('@/features/cameras/hooks/use-camera-rows', () => ({
  useCameraRows: () => ({ cameras: camera ? [camera] : [], isPendingZone: () => false }),
}));

mock.module('@/features/cameras/hooks/use-camera-recording', () => ({
  useCameraRecording: () => recording,
}));

mock.module('@/features/cameras/hooks/use-clip-playback', () => ({
  useClipPlayback: () => playback,
}));

mock.module('@/features/cameras/components/camera-live-view', () => ({
  CameraLiveView: () => null,
}));

mock.module('@/features/cameras/components/clip-player', () => ({
  ClipPlayer: () => <span data-testid="clip-player" />,
}));

mock.module('@/features/cameras/components/zone-editor', () => ({
  ZoneEditor: ({ onChange }: { onChange: (points: { x: number; y: number }[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          { x: 0.1, y: 0.1 },
          { x: 0.5, y: 0.1 },
          { x: 0.3, y: 0.6 },
        ])
      }>
      Marcar
    </button>
  ),
}));

mock.module('@/features/cameras/components/camera-live-view', () => ({
  CameraLiveView: () => null,
  CameraLiveStream: () => null,
}));

mock.module('@/features/cameras/services/camera-clips.service', () => ({ cameraClipsService: {} }));

mock.module('@/features/cameras/services/camera-control.service', () => ({
  cameraControlService: { talk: async () => ({ ok: true }) },
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    can: () => true,
    clips: { view: true, remove: true },
  }),
}));

mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () => ({ formatTime: () => '21:53', formatDayMonth: () => '26 oct' }),
}));

mock.module('@/core/services/zone.service', () => ({
  zoneService: {
    create: async () => ({ ok: true }),
    update: async () => ({ ok: true }),
    remove: async () => ({ ok: true }),
  },
}));

mock.module('@/shared/libs/service-action', () => ({
  runServiceAction: async (action: { call: () => Promise<unknown> }) => {
    actions.push(action);
    return { ok: true };
  },
}));

mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: async (action: { call: () => Promise<unknown> }) => {
    calls.push('optimistic');
    return action.call();
  },
}));

const { default: CameraRecordingsScreen } =
  await import('@/features/cameras/screens/camera-recordings-screen');
const { default: CameraZonesScreen } =
  await import('@/features/cameras/screens/camera-zones-screen');
const { RecordingGuide } = await import('@/features/cameras/components/recordings/recording-guide');
const { ZoneGuide } = await import('@/features/cameras/components/zones/zone-guide');
const { ClipStage } = await import('@/features/cameras/components/recordings/clip-stage');
const { ZoneSheet } = await import('@/features/cameras/components/zones/zone-sheet');
const { AnnounceSheet } = await import('@/features/cameras/components/live/announce-sheet');

afterEach(() => {
  calls.length = 0;
  pushed.length = 0;
  actions.length = 0;
  camera = cameraRow();
  recording = null;
  playback = playbackOf();
});

describe('Grabaciones', () => {
  test('the old recordings route opens Clips filtered to its camera', () => {
    render(<CameraRecordingsScreen />);
    expect(screen.getByTestId('redirect').textContent).toBe('/clips');
  });

  test('the clip stage plays a video, says a failure in words and closes', () => {
    const { rerender } = render(<ClipStage playback={playbackOf({ state: 'ready', clip })} />);
    expect(screen.getByTestId('clip-player')).toBeDefined();
    rerender(<ClipStage playback={playbackOf({ state: 'failed', clip })} />);
    expect(screen.getByText('No se pudo cargar el clip')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(calls).toEqual(['close']);
  });

  test('on the clip screen the stage stays and offers to play again', () => {
    render(
      <ClipStage
        playback={playbackOf({
          state: 'ready',
          clip,
          file: { init: new Uint8Array(), track: null, fragments: [] },
        })}
        closable={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver de nuevo' }));
    expect(calls).toEqual(['replay']);
  });
});

describe('Zonas', () => {
  test('lists the zones by name with their kind', () => {
    render(<CameraZonesScreen />);
    expect(screen.getByRole('button', { name: /^Jardín, Alertar/ })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Añadir zona/ }));
    expect(
      screen.getByText('Añadir zona', { selector: '[role=heading] *, [role=heading]' })
    ).toBeDefined();
  });

  test('without zones it explains them and offers to add the first', () => {
    camera = cameraRow({ zones: [] });
    render(<CameraZonesScreen />);
    expect(screen.getByText('Sin zonas definidas')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir zona' }));
    expect(
      screen.getByText('Añadir zona', { selector: '[role=heading] *, [role=heading]' })
    ).toBeDefined();
  });

  test('a zone is deleted after its confirmation', () => {
    render(<CameraZonesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar la zona Jardín' }));
    expect(calls).toEqual(['optimistic']);
  });

  test('a camera that is gone redirects to the list', () => {
    camera = null;
    render(<CameraZonesScreen />);
    expect(screen.getByTestId('redirect').textContent).toBe('/cameras');
  });
});

describe('the guides beside an empty list', () => {
  test('recordings explain how this camera records and lead to its settings', () => {
    render(<RecordingGuide camera={cameraRow({ retentionDays: 45 })} />);
    expect(screen.getByText('Guarda 45 días')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Solo eventos/ }));
    expect(pushed).toEqual(['/cameras/3/settings']);
  });

  test('zones explain their four kinds', () => {
    render(<ZoneGuide />);
    for (const kind of ['Vigilar', 'Alertar', 'Ignorar', 'Máscara de privacidad'])
      expect(screen.getByText(kind)).toBeDefined();
  });

  test('an empty zones screen keeps the kinds of zone beside the first step', () => {
    camera = cameraRow({ zones: [] });
    render(<CameraZonesScreen />);
    expect(screen.getByText('Sin zonas definidas')).toBeDefined();
    expect(screen.getByText('Tipos de zona')).toBeDefined();
  });
});

describe('the zone sheet', () => {
  test('asks for a name and three points in words, then saves', async () => {
    let closed = 0;
    render(<ZoneSheet cameraId="3" zone={null} zones={[]} onClose={() => (closed += 1)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    });
    expect(screen.getByText('Ponle un nombre a la zona, de hasta 120 caracteres.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Nombre de la zona'), { target: { value: 'Reja' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    });
    expect(screen.getByText('Marca al menos 3 puntos sobre la imagen.')).toBeDefined();
    fireEvent.click(screen.getByText('Marcar'));
    fireEvent.click(screen.getByRole('radio', { name: 'Color 3' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    });
    expect(closed).toBe(1);
  });
});

describe('the written announcement', () => {
  test('refuses an empty text in words and sends a written one', async () => {
    let closed = 0;
    render(<AnnounceSheet cameraId="3" open onClose={() => (closed += 1)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    });
    expect(screen.getByText('Escribe qué quieres que diga Argus.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Lo que dirá Argus'), { target: { value: 'Ya voy' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    });
    expect(actions).toHaveLength(1);
    expect(closed).toBe(1);
  });
});
