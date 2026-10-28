import { describe, expect, test } from 'bun:test';
import {
  DELTA,
  SYNC,
  dfLaBox,
  flacTrak,
  fragmentOf,
  initSegment,
  videoTrak,
} from '@tests/support/fmp4-fixtures';
import { clipLengthMs, clipSegments, seekableClip } from '@/features/cameras/model/clip-index';
import { splitClipFile } from '@/features/cameras/model/clip-media';

const VIDEO = 90000;
const HOUR = 3600;
const SECONDS = 20;
const LAST_SAMPLE = 3000;

function recordedClip(): Uint8Array {
  const bytes = [...initSegment([videoTrak(1, VIDEO), flacTrak(2)])];
  for (let second = 0; second < SECONDS; second += 1) {
    bytes.push(
      ...fragmentOf({
        track: 1,
        flags: second % 5 === 0 ? SYNC : DELTA,
        payload: [second, 1, 2, 3],
        decodeTime: (HOUR + second) * VIDEO,
      }),
      ...fragmentOf({
        track: 2,
        flags: SYNC,
        payload: [second],
        decodeTime: (HOUR + second) * 8000,
      })
    );
  }
  return new Uint8Array(bytes);
}

type SidxReference = { size: number; duration: number; sap: boolean };

function readSidx(bytes: Uint8Array) {
  const at = new TextDecoder('latin1').decode(bytes).indexOf('sidx') - 4;
  const view = new DataView(bytes.buffer, bytes.byteOffset + at);
  const count = view.getUint16(38);
  const references: SidxReference[] = Array.from({ length: count }, (_, index) => ({
    size: view.getUint32(44 + index * 12) & 0x7fffffff,
    duration: view.getUint32(48 + index * 12),
    sap: (view.getUint32(52 + index * 12) & 0x80000000) !== 0,
  }));
  return {
    at,
    end: at + view.getUint32(0),
    trackId: view.getUint32(12),
    timescale: view.getUint32(16),
    earliest: Number(view.getBigUint64(20)),
    firstOffset: Number(view.getBigUint64(28)),
    references,
  };
}

const indexOf = (haystack: Uint8Array, needle: readonly number[]): number =>
  new TextDecoder('latin1')
    .decode(haystack)
    .indexOf(new TextDecoder('latin1').decode(new Uint8Array(needle)));

describe('a seekable clip', () => {
  test('one index entry per keyframe group, starting at zero and spanning the whole clip', () => {
    const file = splitClipFile(recordedClip());
    if (!file) throw new Error('clip');
    expect(clipSegments(file.fragments).map((segment) => segment.first)).toEqual([0, 10, 20, 30]);
    const sidx = readSidx(seekableClip(file));
    expect(sidx).toMatchObject({ trackId: 1, timescale: VIDEO, earliest: 0, firstOffset: 0 });
    expect(sidx.references.map((reference) => reference.duration)).toEqual([
      5 * VIDEO,
      5 * VIDEO,
      5 * VIDEO,
      4 * VIDEO + LAST_SAMPLE,
    ]);
    expect(sidx.references.every((reference) => reference.sap)).toBe(true);
    expect(clipLengthMs(file)).toBe(19_033);
  });

  test('the index sits right after moov and its sizes cover every fragment byte, in order', () => {
    const file = splitClipFile(recordedClip());
    if (!file) throw new Error('clip');
    const out = seekableClip(file);
    const sidx = readSidx(out);
    expect(sidx.at).toBe(file.init.byteLength);
    const total = sidx.references.reduce((sum, reference) => sum + reference.size, 0);
    expect(sidx.end + total).toBe(out.byteLength);
    expect(new TextDecoder('latin1').decode(out.subarray(sidx.end + 4, sidx.end + 8))).toBe('moof');
  });

  test("the audio track's FLAC STREAMINFO (dfLa) reaches the player byte for byte", () => {
    const file = splitClipFile(recordedClip());
    if (!file) throw new Error('clip');
    const out = seekableClip(file);
    const dfLa = dfLaBox();
    expect(indexOf(out, dfLa)).toBeGreaterThan(0);
    expect(Array.from(out.subarray(0, file.init.byteLength))).toEqual(
      Array.from(recordedClip().subarray(0, file.init.byteLength))
    );
  });
});
