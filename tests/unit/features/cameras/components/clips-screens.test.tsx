import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useState } from 'react';
import type { ICameraCacheRow, ICameraClip } from '@/core/interfaces';
import type { ClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { cameraRow } from './camera-fixtures';

type Href = string | { pathname: string; params?: Record<string, string> };

const pushed: string[] = [];

const opened: string[] = [];

const params: { camera?: string; id?: string; scope?: string } = {};

const clipOf = (id: string, cameraId = '3'): ICameraClip => ({
  id,
  cameraId,
  trigger: 'event',
  contentType: 'video/mp4',
  codec: 'h264',
  startedAt: Math.floor(Date.now() / 1000),
  durationMs: 21_000,
  byteSize: 2_000_000,
  createdAt: Number(id),
  expiresAt: 0,
});

const feed = {
  rows: [] as ICameraClip[],
  status: 'ready' as 'ready' | 'loading' | 'failed' | 'idle',
  hasMore: false,
  footer: 'none' as 'none' | 'loading' | 'error' | 'end',
};

const access = { view: true, remove: true };

let cameras: ICameraCacheRow[] = [cameraRow(), cameraRow({ id: '4', name: 'Patio' })];

const playback: ClipPlayback = {
  state: 'idle',
  clip: null,
  file: null,
  image: null,
  open: (clip) => opened.push(clip.id),
  replay: () => undefined,
  close: () => undefined,
};

const feedCopies = { fresh: false };

function useRenderingPlayback(): ClipPlayback {
  const [, setOpened] = useState(0);
  const open = useCallback((clip: ICameraClip) => {
    playback.open(clip);
    setOpened((count) => count + 1);
  }, []);
  return { ...playback, open };
}

const hrefOf = (href: Href) =>
  typeof href === 'string'
    ? href
    : `${href.pathname}${href.params?.camera ? `?camera=${href.params.camera}` : ''}`;

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => params,
  useRouter: () => ({
    push: (href: Href) => pushed.push(hrefOf(href)),
    replace: (href: Href) => pushed.push(`replace:${hrefOf(href)}`),
    back: () => pushed.push('back'),
    canGoBack: () => true,
    setParams: (next: { camera?: string }) => pushed.push(`camera:${next.camera ?? 'all'}`),
  }),
  useIsFocused: () => screenFocus.focused,
  useFocusEffect: () => undefined,
}));

mock.module('@/features/cameras/hooks/use-clip-feed', () => ({
  useClipFeed: () => ({
    rows: feed.rows,
    status: feed.status,
    hasMore: feed.hasMore,
    reload: async () => undefined,
    loadMore: async () => true,
    paging: {
      footer: feed.footer,
      loading: false,
      onEndReached: () => pushed.push('more'),
      retry: () => undefined,
    },
  }),
}));

mock.module('@/features/cameras/hooks/use-clip-poster', () => ({
  useClipPoster: () => null,
}));

mock.module('@/features/cameras/hooks/use-camera-rows', () => ({
  useCameraRows: () => ({ cameras }),
}));

mock.module('@/features/cameras/hooks/use-camera-recording', () => ({
  useCameraRecording: () => null,
}));

mock.module('@/features/cameras/hooks/use-clip-playback', () => ({
  useClipPlayback: useRenderingPlayback,
}));

mock.module('@/features/cameras/components/clip-player', () => ({
  ClipPlayer: () => <span data-testid="clip-player" />,
}));

mock.module('@/features/cameras/services/camera-clips.service', () => ({
  cameraClipsService: { remove: async () => ({ ok: true }) },
  clipFeed: {
    snapshot: () => ({
      rows: feedCopies.fresh ? feed.rows.map((row) => ({ ...row })) : feed.rows,
      next: null,
    }),
    mutateAll: () => () => undefined,
  },
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ clips: access, can: () => true }),
}));

mock.module('@/shared/libs/service-action', () => ({
  runServiceAction: async () => ({ ok: true }),
}));

mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () => ({ formatTime: () => '14:02', formatDayMonth: () => '26 oct' }),
}));

const { ClipTile } = await import('@/features/cameras/components/clips/clip-tile');
const { RecentClipsCard } = await import('@/features/cameras/components/clips/recent-clips-card');
const { default: ClipsScreen } = await import('@/features/cameras/screens/clips-screen');
const { default: ClipScreen } = await import('@/features/cameras/screens/clip-screen');

afterEach(() => {
  pushed.length = 0;
  opened.length = 0;
  feed.rows = [];
  feed.status = 'ready';
  feed.hasMore = false;
  feed.footer = 'none';
  access.view = true;
  access.remove = true;
  feedCopies.fresh = false;
  cameras = [cameraRow(), cameraRow({ id: '4', name: 'Patio' })];
  for (const key of Object.keys(params)) delete params[key as keyof typeof params];
});

describe('a clip tile', () => {
  test('names its camera, says when and how long, and plays on a tap', () => {
    const tapped: string[] = [];
    render(
      <ClipTile
        clip={clipOf('9')}
        cameraName="Cocina"
        detail="hoy 14:02 · 0:21"
        onOpen={(clip) => tapped.push(clip.id)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cocina, hoy 14:02 · 0:21' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver el clip de Cocina' }));
    expect(tapped).toEqual(['9', '9']);
  });
});

describe('Clips recientes on Inicio', () => {
  test('the three newest clips and «Ver todos»', () => {
    feed.rows = ['9', '8', '7', '6'].map((id) => clipOf(id));
    render(<RecentClipsCard />);
    expect(screen.getByRole('heading', { name: 'Clips recientes' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /^Ver el clip de/ }).length).toBe(3);
    fireEvent.click(screen.getByRole('link', { name: 'Ver todos' }));
    expect(pushed).toEqual(['/clips']);
  });

  test('with no clip, or a role that reads none, it leaves no header behind', () => {
    const { container } = render(<RecentClipsCard />);
    expect(container.textContent).toBe('');
    feed.rows = [clipOf('9')];
    access.view = false;
    const again = render(<RecentClipsCard />);
    expect(again.container.textContent).toBe('');
  });

  test('a clip of a camera that is gone is not shown', () => {
    feed.rows = [clipOf('9', '77')];
    const { container } = render(<RecentClipsCard />);
    expect(container.textContent).toBe('');
  });
});

describe('the Clips screen', () => {
  test('every camera’s clips in a grid, a filter per camera, and a tap opens the player', () => {
    feed.rows = [clipOf('9'), clipOf('8', '4')];
    render(<ClipsScreen />);
    expect(screen.getByRole('heading', { name: 'Clips' })).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Patio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver el clip de Patio' }));
    expect(pushed).toEqual(['camera:4', '/clips/[id]?camera=4']);
  });

  test('an empty list is a centred notice that leads to the cameras', () => {
    render(<ClipsScreen />);
    expect(screen.getByText('Aún no hay clips')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver cámaras' }));
    expect(pushed).toEqual(['/cameras']);
  });

  test('filtered to a camera that does not record, it says so and keeps its guide', () => {
    params.camera = '3';
    cameras = [cameraRow({ recordMode: 'off' })];
    render(<ClipsScreen />);
    expect(screen.getByText('Esta cámara no graba')).toBeDefined();
    expect(screen.getByText('Cómo graba')).toBeDefined();
    expect(screen.queryByRole('tab', { name: 'Todas' })).toBeNull();
  });

  test('more clips load on demand, never all at once', () => {
    feed.rows = [clipOf('9')];
    feed.hasMore = true;
    feed.footer = 'loading';
    render(<ClipsScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Cargar clips anteriores' }));
    expect(pushed).toEqual(['more']);
  });

  test('a failed first load offers Reintentar, never the empty copy', () => {
    feed.status = 'failed';
    render(<ClipsScreen />);
    expect(screen.queryByText('Aún no hay clips')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
  });
});

describe('the clip player', () => {
  test('opens its clip once although the cache hands a new copy on every read', () => {
    feedCopies.fresh = true;
    feed.rows = [clipOf('9')];
    Object.assign(params, { id: '9', camera: '3', scope: 'all' });
    const { rerender } = render(<ClipScreen />);
    rerender(<ClipScreen />);
    expect(opened).toEqual(['9']);
  });

  test('plays the clip it was opened with, offers its camera and its deletion', () => {
    feed.rows = [clipOf('9')];
    Object.assign(params, { id: '9', camera: '3', scope: 'all' });
    render(<ClipScreen />);
    expect(opened).toEqual(['9']);
    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Eliminar clip' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Ver en vivo/ }));
    expect(pushed).toEqual(['/cameras/3']);
  });

  test('a guard plays but does not delete; a clip no longer known leads back to the list', () => {
    access.remove = false;
    feed.rows = [clipOf('9')];
    Object.assign(params, { id: '9', camera: '3' });
    const first = render(<ClipScreen />);
    expect(screen.queryByRole('button', { name: 'Eliminar clip' })).toBeNull();
    first.unmount();
    feed.rows = [];
    render(<ClipScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos los clips' }));
    expect(pushed).toEqual(['replace:/clips']);
  });
});
