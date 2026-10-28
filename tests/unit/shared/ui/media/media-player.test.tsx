import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { PlayerStatus } from '@/shared/ui/media/player/player-model';
import type {
  SurfaceEvents,
  SurfaceHandle,
  VideoSurfaceProps,
} from '@/shared/ui/media/player/video-surface-types';
import '../translation-stub';

const commands: string[] = [];

const surface: { events: SurfaceEvents | null; position: number } = { events: null, position: 0 };

const handle: SurfaceHandle = {
  play: () => void commands.push('play'),
  pause: () => void commands.push('pause'),
  seekTo: (ms) => void commands.push(`seek ${ms}`),
  setRate: (rate) => void commands.push(`rate ${rate}`),
  reclaim: () => void commands.push('reclaim'),
  positionMs: () => surface.position,
  durationMs: () => 19_000,
  bufferedMs: () => 19_000,
};

const announced: string[] = [];

function FakeSurface({ events, muted }: VideoSurfaceProps) {
  surface.events = events;
  useEffect(() => {
    surface.events?.onReady(handle);
  }, []);
  return <span data-testid="surface" data-muted={String(muted)} />;
}

mock.module('@/shared/ui/media/player/video-surface', () => ({ VideoSurface: FakeSurface }));
mock.module('@/shared/ui/media/player/player-fullscreen', () => ({
  FULLSCREEN_ADOPTS: false,
  PlayerFullscreen: () => null,
}));

const { MediaPlayer } = await import('@/shared/ui/media/player/media-player');

const SOURCE = { key: 'clip:1:9', data: new ArrayBuffer(8) };

const emit = (status: PlayerStatus) => act(() => surface.events?.onStatus(status));

const paint = () => act(() => surface.events?.onFirstFrame());

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

AccessibilityInfo.announceForAccessibility = (message: string) => void announced.push(message);

afterEach(() => {
  commands.length = 0;
  announced.length = 0;
  surface.events = null;
  surface.position = 0;
});

describe('MediaPlayer', () => {
  test('until the first frame it shows the poster, then the poster gives way to the video', () => {
    render(<MediaPlayer source={SOURCE} poster="data:image/jpeg;base64,cG9zdGVy" />);
    expect(document.querySelector('img')?.getAttribute('src')).toContain('cG9zdGVy');
    paint();
    expect(document.querySelector('img')).toBeNull();
  });

  test('with no poster it waits on a skeleton, and says «Cargando el video» once', () => {
    render(<MediaPlayer source={null} />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByTestId('surface')).toBeNull();
    expect(announced).toEqual(['Cargando el video']);
  });

  test('plays with sound by default, pauses and plays from the centre, and mutes', () => {
    render(<MediaPlayer source={SOURCE} />);
    expect(screen.getByTestId('surface').getAttribute('data-muted')).toBe('false');
    emit('playing');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    emit('ready');
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
    expect(commands).toEqual(['rate 1', 'pause', 'play']);
    expect(screen.getByTestId('surface').getAttribute('data-muted')).toBe('true');
  });

  test('elapsed and total are always with the controls, and a tap shows the time left', async () => {
    render(<MediaPlayer source={SOURCE} />);
    surface.position = 5000;
    emit('ready');
    expect(screen.getByText('0:05 / 0:19')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar el tiempo restante' }));
    expect(screen.getByText('0:05 / -0:14')).toBeDefined();
  });

  test('at the end it offers to play again', () => {
    const ended: string[] = [];
    render(<MediaPlayer source={SOURCE} onEnded={() => ended.push('ended')} />);
    emit('ended');
    fireEvent.click(screen.getByRole('button', { name: 'Ver de nuevo' }));
    expect(ended).toEqual(['ended']);
    expect(commands).toContain('play');
  });

  test('a failure says so in words and offers to retry', () => {
    const retried: string[] = [];
    render(<MediaPlayer source={SOURCE} onRetry={() => retried.push('retry')} />);
    emit('error');
    expect(screen.getByText('No se pudo reproducir el video')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retried).toEqual(['retry']);
  });

  test('a wait after the picture started shows the spinner only past 300 ms', async () => {
    render(<MediaPlayer source={SOURCE} />);
    paint();
    emit('loading');
    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).toBeNull();
    await wait(150);
    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).toBeNull();
    await wait(250);
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeDefined();
    emit('playing');
    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).toBeNull();
  });

  test('a lost audio track says «Sin audio» instead of offering to mute', () => {
    render(<MediaPlayer source={SOURCE} />);
    act(() => surface.events?.onAudioFailed());
    expect(screen.getByText('Sin audio')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Silenciar' })).toBeNull();
  });

  test('a clip left midway resumes where it was', () => {
    const first = render(<MediaPlayer source={SOURCE} />);
    surface.position = 7000;
    emit('playing');
    first.unmount();
    commands.length = 0;
    render(<MediaPlayer source={{ ...SOURCE }} />);
    emit('ready');
    expect(commands).toContain('seek 7000');
  });
});
