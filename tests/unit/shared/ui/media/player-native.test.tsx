import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { Text } from 'react-native';
import type { SurfaceEvents } from '@/shared/ui/media/player/video-surface-types';
import '../translation-stub';

type NativeProps = {
  hybridRef?: (view: unknown) => void;
  onMediaState?: (state: string) => void;
  onFirstFrame?: () => void;
  onAudioFailed?: () => void;
};

const calls: string[] = [];

const native: { props: NativeProps; adoptable: boolean } = { props: {}, adoptable: false };

const view = {
  loadMedia: (_data: ArrayBuffer, key: string) => void calls.push(`load ${key}`),
  adoptMedia: (key: string) => {
    calls.push(`adopt ${key}`);
    return native.adoptable;
  },
  releaseMedia: (key: string) => void calls.push(`release ${key}`),
  play: () => void calls.push('play'),
  pause: () => undefined,
  seekTo: (ms: number) => void calls.push(`seek ${ms}`),
  setRate: () => undefined,
  mediaPositionMs: () => 4000,
  mediaDurationMs: () => 19_000,
  mediaBufferedMs: () => 19_000,
};

function FakeView(props: NativeProps) {
  native.props = props;
  useEffect(() => props.hybridRef?.(view), [props]);
  return null;
}

mock.module('argus-camera', () => ({ ArgusCameraView: FakeView }));
mock.module('react-native-nitro-modules', () => ({ callback: <T,>(fn: T) => fn }));
mock.module('@rn-primitives/portal', () => ({
  Portal: ({ children }: { children: ReactNode }) => children,
}));
mock.module('react-native-edge-to-edge', () => ({ SystemBars: () => null }));
mock.module('@/shared/libs/window-fullscreen', () => ({
  enterWindowFullscreen: async () => void calls.push('landscape'),
  exitWindowFullscreen: async () => void calls.push('portrait'),
  releaseWindowOrientation: async () => undefined,
}));

const { VideoSurface } = await import('@/shared/ui/media/player/video-surface.native');
const { PlayerFullscreen, FULLSCREEN_ADOPTS } =
  await import('@/shared/ui/media/player/player-fullscreen.native');

const SOURCE = { key: 'clip:1:9', data: new ArrayBuffer(4) };

function eventsOf(log: string[]): SurfaceEvents {
  return {
    onReady: (handle) => void log.push(`ready ${handle.positionMs()}`),
    onStatus: (status) => void log.push(`status ${status}`),
    onFirstFrame: () => void log.push('first frame'),
    onAudioFailed: () => void log.push('no audio'),
  };
}

afterEach(() => {
  calls.length = 0;
  native.adoptable = false;
});

describe('the native surface', () => {
  test('loads the clip into the view, reports its states and releases it on unmount', () => {
    const log: string[] = [];
    const shown = render(
      <VideoSurface source={SOURCE} autoPlay muted={false} events={eventsOf(log)} />
    );
    act(() => native.props.onMediaState?.('playing'));
    act(() => native.props.onFirstFrame?.());
    shown.unmount();
    expect(calls).toEqual(['load clip:1:9', 'release clip:1:9']);
    expect(log).toEqual(['ready 4000', 'status playing', 'first frame']);
  });

  test('a fullscreen surface takes over the playing session instead of loading again', () => {
    native.adoptable = true;
    const shown = render(
      <VideoSurface source={SOURCE} adopt autoPlay muted={false} events={eventsOf([])} />
    );
    expect(calls).toEqual(['adopt clip:1:9']);
    shown.unmount();
  });
});

describe('the native fullscreen', () => {
  test('turns the phone to landscape while open and back when it closes', () => {
    expect(FULLSCREEN_ADOPTS).toBe(true);
    const shown = render(
      <PlayerFullscreen open onExit={() => undefined}>
        <Text>video</Text>
      </PlayerFullscreen>
    );
    expect(screen.getByText('video')).toBeDefined();
    shown.rerender(
      <PlayerFullscreen open={false} onExit={() => undefined}>
        <Text>video</Text>
      </PlayerFullscreen>
    );
    expect(calls).toEqual(['landscape', 'portrait']);
    expect(screen.queryByText('video')).toBeNull();
  });
});
