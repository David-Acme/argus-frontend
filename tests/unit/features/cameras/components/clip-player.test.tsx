import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { DELTA, SYNC, fragmentOf, initSegment, videoTrak } from '@tests/support/fmp4-fixtures';

type NativeViewProps = { hybridRef?: (player: unknown) => void };

const pushed: number[] = [];

let refsHanded = 0;

mock.module('argus-camera', () => ({
  ArgusCameraView: ({ hybridRef }: NativeViewProps) => {
    useEffect(() => {
      refsHanded += 1;
      hybridRef?.({
        resetStream: () => undefined,
        pushFragment: (type: number) => pushed.push(type),
        bufferedBytes: () => 0,
      });
    });
    return <span data-testid="native-player" />;
  },
}));

mock.module('react-native-nitro-modules', () => ({
  callback: <T,>(fn: T) => fn,
}));

mock.module('@/features/cameras/services/camera-clips.service', () => ({
  cameraClipsService: {},
}));

const { ClipPlayer } = await import('@/features/cameras/components/clip-player.native');
const { splitClipFile, clipDurationMs } = await import('@/features/cameras/model/clip-media');

const TIMESCALE = 90000;

const FRAGMENTS = 20;

function nineteenSeconds(): Uint8Array {
  const parts = Array.from({ length: FRAGMENTS }, (_, index) =>
    fragmentOf({
      track: 1,
      flags: index % 5 === 0 ? SYNC : DELTA,
      payload: [index, 1, 2, 3],
      decodeTime: TIMESCALE + index * TIMESCALE,
    })
  );
  const bytes = [...initSegment([videoTrak(1, TIMESCALE)])];
  for (const part of parts) bytes.push(...part);
  return new Uint8Array(bytes);
}

afterEach(() => {
  cleanup();
  pushed.length = 0;
  refsHanded = 0;
});

describe('the native clip player', () => {
  test('a 19 s clip splits into its init and every fragment, timed across 19 s', () => {
    const file = splitClipFile(nineteenSeconds());
    expect(file?.fragments).toHaveLength(FRAGMENTS);
    expect(file && clipDurationMs(file.fragments)).toBe(19_000);
  });

  test('the init goes once and the fragments follow in time, however often the view hands its ref', async () => {
    const file = splitClipFile(nineteenSeconds());
    render(<ClipPlayer file={file} />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(refsHanded).toBeGreaterThan(1);
    expect(pushed.filter((type) => type === 1)).toHaveLength(1);
    expect(pushed[0]).toBe(1);
    expect(pushed.filter((type) => type === 2).length).toBe(2);
  });
});
