import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ICameraCacheRow, ICameraClip, ICameraRecordingState } from '@/core/interfaces';
import type { CameraClipsState } from '@/features/cameras/hooks/use-camera-clips';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { calls, cameraRow } from './camera-fixtures';

const pushed: string[] = [];

const actions: { call: () => Promise<unknown> }[] = [];

let camera: ICameraCacheRow | null = cameraRow();

let clips: CameraClipsState;

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

function clipsOf(
  rows: ICameraClip[],
  status: CameraClipsState['status'] = 'ready'
): CameraClipsState {
  return {
    clips: rows,
    status,
    hasMore: false,
    loadingMore: false,
    loadMore: () => undefined,
    forget: () => calls.push('forget'),
    reload: async () => {
      calls.push('reload');
    },
  };
}

function playbackOf(overrides: Partial<ClipPlayback> = {}): ClipPlayback {
  return {
    state: 'idle',
    clip: null,
    file: null,
    image: null,
    open: (opened) => calls.push(`open:${opened.id}`),
    close: () => calls.push('close'),
    ...overrides,
  };
}

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

mock.module('@/features/cameras/hooks/use-camera-live', () => ({ useCameraRow: () => camera }));

mock.module('@/features/cameras/hooks/use-camera-rows', () => ({
  useCameraRows: () => ({ cameras: camera ? [camera] : [], isPendingZone: () => false }),
}));

mock.module('@/features/cameras/hooks/use-camera-clips', () => ({ useCameraClips: () => clips }));

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
  test('lists the clips and plays one on a tap', () => {
    clips = clipsOf([clip]);
    playback = playbackOf();
    render(<CameraRecordingsScreen />);
    expect(screen.getByRole('heading', { name: 'Grabaciones' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Evento/ }));
    expect(calls).toEqual(['open:9']);
  });

  test('with no clips it says what will appear and leads back to the live view', () => {
    clips = clipsOf([]);
    playback = playbackOf();
    render(<CameraRecordingsScreen />);
    expect(screen.getByText('Aún no hay clips')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver en vivo' }));
    expect(pushed).toEqual(['back']);
  });

  test('a camera that does not record leads to its settings', () => {
    camera = cameraRow({ recordMode: 'off' });
    clips = clipsOf([], 'idle');
    playback = playbackOf();
    render(<CameraRecordingsScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes de la cámara' }));
    expect(pushed).toEqual(['/cameras/3/settings']);
  });

  test('a failed first load offers Reintentar, never the empty copy', () => {
    clips = clipsOf([], 'failed');
    playback = playbackOf();
    render(<CameraRecordingsScreen />);
    expect(screen.queryByText('Aún no hay clips')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(calls).toEqual(['reload']);
  });

  test('paused recording is said at the top', () => {
    clips = clipsOf([clip]);
    playback = playbackOf();
    recording = { paused: true, freeGb: 3, minFreeGb: 10, freeBytes: 0 };
    render(<CameraRecordingsScreen />);
    expect(screen.getByText(/Grabación en pausa por falta de espacio/)).toBeDefined();
  });

  test('the clip stage plays a video, says a failure in words and closes', () => {
    const { rerender } = render(<ClipStage playback={playbackOf({ state: 'ready', clip })} />);
    expect(screen.getByTestId('clip-player')).toBeDefined();
    rerender(<ClipStage playback={playbackOf({ state: 'failed', clip })} />);
    expect(screen.getByText('No se pudo cargar el clip')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(calls).toEqual(['close']);
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
