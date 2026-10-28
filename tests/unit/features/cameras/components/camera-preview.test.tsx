import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import type { PreviewEntry } from '@/features/cameras/services/preview-channel';
import { SYNC, fragmentOf, initSegment, videoTrak } from '@tests/support/fmp4-fixtures';

type NativeViewProps = {
  hybridRef?: (player: unknown) => void;
  fill?: boolean;
  style?: { opacity?: number };
};

const attached: PreviewEntry[] = [];
let detached = 0;
let granted = true;

const received: Uint8Array[] = [];

const fakePlayer = {
  resetStream: () => undefined,
  pushFragment: (type: number, _keyframe: boolean, data: ArrayBuffer) => {
    if (type === 2) received.push(new Uint8Array(data));
  },
  bufferedBytes: () => 0,
};

mock.module('argus-camera', () => ({
  ArgusCameraView: ({ hybridRef, fill, style }: NativeViewProps) => {
    useEffect(() => hybridRef?.(fakePlayer), [hybridRef]);
    return (
      <span
        data-testid="native-player"
        data-fill={String(fill)}
        data-opacity={String(style?.opacity)}
      />
    );
  },
}));

mock.module('react-native-nitro-modules', () => ({
  callback: <T,>(fn: T) => fn,
}));

mock.module('@/features/cameras/hooks/use-camera-preview', () => ({
  useCameraPreview: () => ({ frame: { current: null }, live: granted }),
}));

mock.module('@/features/cameras/services/camera-preview-mux', () => ({
  cameraPreviewMux: {
    attach: (entry: PreviewEntry) => {
      attached.push(entry);
      return () => {
        detached += 1;
      };
    },
  },
}));

const { CameraPreview: NativePreview } =
  await import('@/features/cameras/components/camera-preview.native');
const { CameraPreview: WebPreview } =
  await import('@/features/cameras/components/camera-preview.web');

function Tile({ children }: { children: ReactNode }) {
  return <div data-testid="tile">{children}</div>;
}

afterEach(() => {
  cleanup();
  attached.length = 0;
  received.length = 0;
  detached = 0;
  granted = true;
});

describe('CameraPreview on native', () => {
  test('a granted tile plays its camera without fastStart and stays clear until it is live', async () => {
    render(
      <Tile>
        <NativePreview cameraId="4" order={1} />
      </Tile>
    );
    expect(attached).toHaveLength(1);
    expect(attached[0]?.cameraId).toBe(4);
    expect(attached[0]?.order).toBe(1);
    expect(attached[0]?.fastStart).toBe(false);
    expect(screen.getByTestId('native-player').getAttribute('data-opacity')).toBe('0');
    act(() => attached[0]?.onState('live'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(screen.getByTestId('native-player').getAttribute('data-opacity')).toBe('1');
  });

  test('the video covers the tile the way its still does, so the handover lines up', () => {
    render(<NativePreview cameraId="4" order={0} />);
    expect(screen.getByTestId('native-player').getAttribute('data-fill')).toBe('true');
  });

  test('the still stays drawn over the player until the first frame is shown', async () => {
    render(<NativePreview cameraId="4" order={0} still="data:image/jpeg;base64,c3RpbGw=" />);
    const still = () =>
      [...document.querySelectorAll('img')].some((img) =>
        img.getAttribute('src')?.includes('c3RpbGw=')
      );
    expect(still()).toBe(true);
    act(() => attached[0]?.onState('live'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(still()).toBe(false);
  });

  test("the stream's hour-old timestamps reach the native player starting from zero", () => {
    render(<NativePreview cameraId="4" order={0} />);
    const sink = attached[0]?.sink;
    sink?.pushFragment(1, true, initSegment([videoTrak(1, 90000)]).buffer as ArrayBuffer);
    const fragment = fragmentOf({ track: 1, flags: SYNC, payload: [1], decodeTime: 3600 * 90000 });
    sink?.pushFragment(2, true, fragment.buffer as ArrayBuffer);
    const bytes = received[0] ?? new Uint8Array();
    const at = new TextDecoder('latin1').decode(bytes).indexOf('tfdt');
    expect(new DataView(bytes.buffer, bytes.byteOffset).getBigUint64(at + 8)).toBe(0n);
  });

  test('a tile past the cap mounts no player and leaves the still alone', () => {
    granted = false;
    render(<NativePreview cameraId="4" order={7} />);
    expect(screen.queryByTestId('native-player')).toBeNull();
    expect(attached).toHaveLength(0);
  });

  test('unmounting a tile lets its subscription go', () => {
    const view = render(<NativePreview cameraId="4" order={0} />);
    view.unmount();
    expect(detached).toBe(1);
  });
});

describe('CameraPreview on the web', () => {
  test('without WebCodecs the tile keeps its still and subscribes nothing', () => {
    render(<WebPreview cameraId="2" order={0} />);
    expect(attached).toHaveLength(0);
  });

  test('with WebCodecs the tile subscribes with fastStart, since it paints on arrival', () => {
    const scope = globalThis as Record<string, unknown>;
    scope.VideoDecoder = class {};
    scope.EncodedVideoChunk = class {};
    render(<WebPreview cameraId="2" order={3} />);
    delete scope.VideoDecoder;
    delete scope.EncodedVideoChunk;
    expect(attached).toHaveLength(1);
    expect(attached[0]?.fastStart).toBe(true);
    expect(attached[0]?.order).toBe(3);
  });
});
