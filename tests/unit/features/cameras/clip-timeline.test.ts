import { describe, expect, test } from 'bun:test';
import { DELTA, SYNC, fragmentOf, initSegment, videoTrak } from '@tests/support/fmp4-fixtures';
import { rebaseClipTimes, rebasingSink, trackClocks } from '@/features/cameras/model/clip-timeline';
import { clipDurationMs, splitClipFile } from '@/features/cameras/model/clip-media';

const VIDEO = 90000;
const AUDIO = 8000;
const HOUR = 3600;

function decodeTimeOf(fragment: Uint8Array): number {
  const at = new TextDecoder('latin1').decode(fragment).indexOf('tfdt');
  return Number(new DataView(fragment.buffer, fragment.byteOffset).getBigUint64(at + 8));
}

function liveClip(): Uint8Array {
  const bytes = [...initSegment([videoTrak(1, VIDEO), videoTrak(2, AUDIO)])];
  for (let second = 0; second < 20; second += 1) {
    bytes.push(
      ...fragmentOf({
        track: 1,
        flags: second % 5 === 0 ? SYNC : DELTA,
        payload: [second],
        decodeTime: (HOUR + second) * VIDEO,
      }),
      ...fragmentOf({
        track: 2,
        flags: SYNC,
        payload: [second],
        decodeTime: (HOUR + second + 0.5) * AUDIO,
      })
    );
  }
  return new Uint8Array(bytes);
}

describe('a stored clip on its own timeline', () => {
  test('every track keeps its own clock', () => {
    const init = initSegment([videoTrak(1, VIDEO), videoTrak(2, AUDIO)]);
    expect(trackClocks(init)).toEqual(
      new Map([
        [1, VIDEO],
        [2, AUDIO],
      ])
    );
  });

  test('a clip cut from an hour of live stream starts at zero, its tracks still in step', () => {
    const file = splitClipFile(liveClip());
    expect(file).not.toBeNull();
    if (!file) return;
    expect(decodeTimeOf(file.fragments[0]?.bytes ?? new Uint8Array())).toBe(0);
    expect(decodeTimeOf(file.fragments[1]?.bytes ?? new Uint8Array())).toBe(0.5 * AUDIO);
    expect(decodeTimeOf(file.fragments[38]?.bytes ?? new Uint8Array())).toBe(19 * VIDEO);
    expect(file.fragments[0]?.atUs).toBe(0);
    expect(clipDurationMs(file.fragments)).toBe(19_000);
    const times = file.fragments.map((fragment) => fragment.atUs);
    expect(times.every((at, index) => index === 0 || at >= (times[index - 1] ?? 0))).toBe(true);
  });

  test('a clip that already starts at zero is left as it is', () => {
    const init = initSegment([videoTrak(1, VIDEO)]);
    const first = fragmentOf({ track: 1, flags: SYNC, payload: [1], decodeTime: 0 });
    const second = fragmentOf({ track: 1, flags: DELTA, payload: [2], decodeTime: VIDEO });
    rebaseClipTimes(init, [first, second]);
    expect([decodeTimeOf(first), decodeTimeOf(second)]).toEqual([0, VIDEO]);
  });
});

describe('a live stream reaching the native player', () => {
  function recorder() {
    const times: number[] = [];
    const sink = rebasingSink({
      resetStream: () => undefined,
      pushFragment: (type, _keyframe, data) => {
        if (type === 2) times.push(decodeTimeOf(new Uint8Array(data)));
      },
      bufferedBytes: () => 0,
    });
    return { sink, times };
  }

  const push = (sink: ReturnType<typeof rebasingSink>, second: number) => {
    const bytes = fragmentOf({ track: 1, flags: SYNC, payload: [1], decodeTime: second * VIDEO });
    sink.pushFragment(2, true, bytes.buffer as ArrayBuffer);
  };

  const init = () => initSegment([videoTrak(1, VIDEO)]).buffer as ArrayBuffer;

  test('an hour into the stream, the first fragment plays at zero and the next follow it', () => {
    const { sink, times } = recorder();
    sink.pushFragment(1, true, init());
    push(sink, HOUR);
    push(sink, HOUR + 1);
    push(sink, HOUR + 2);
    expect(times).toEqual([0, VIDEO, 2 * VIDEO]);
  });

  test('a new init, after a reconnect, starts a new timeline', () => {
    const { sink, times } = recorder();
    sink.pushFragment(1, true, init());
    push(sink, HOUR);
    sink.pushFragment(1, true, init());
    push(sink, 2 * HOUR);
    sink.resetStream();
    sink.pushFragment(1, true, init());
    push(sink, 3 * HOUR);
    expect(times).toEqual([0, 0, 0]);
  });
});
