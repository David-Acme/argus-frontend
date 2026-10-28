import { describe, expect, test } from 'bun:test';
import type { ICameraClips } from '@/core/interfaces';
import {
  clipDurationMs,
  clipPaceSteps,
  decodeBase64,
  splitClipFile,
} from '@/features/cameras/model/clip-media';
import {
  CLIP_FEED_ALL,
  clipColumns,
  clipContentOf,
  clipDetail,
  clipFacts,
  clipGlyph,
  clipFeedCamera,
  clipFeedPath,
  clipFeedScope,
  clipGridRows,
  clipImageUri,
  clipMoment,
  clipOfRow,
  clipPageOf,
  clipRowsOf,
  clipTriggerLabelKey,
  compareClips,
  formatClipDuration,
  formatClipSize,
  isImageClip,
  visibleClips,
} from '@/features/cameras/model/camera-clips';
import {
  recordModeLabelKey,
  recordModeOptions,
  recordsSomething,
} from '@/features/cameras/model/camera-record-mode';
import type { TranslateFn } from '@/core/types';
import { DELTA, SYNC, fragment, initSegment, videoTrak } from '@tests/support/fmp4-fixtures';

function clipBytes(): Uint8Array {
  const init = initSegment([videoTrak(1, 90000)]);
  const key = fragment(1, SYNC, [1, 2, 3, 4]);
  const delta = fragment(1, DELTA, [5, 6, 7, 8]);
  return new Uint8Array([...init, ...key, ...delta]);
}

const t = ((key: string) => key) as unknown as TranslateFn;

describe('clip media', () => {
  test('base64 decodes with and without padding', () => {
    expect(Array.from(decodeBase64('AQIDBA=='))).toEqual([1, 2, 3, 4]);
    expect(Array.from(decodeBase64('aGk='))).toEqual([104, 105]);
    expect(Array.from(decodeBase64('aGVsbG8'))).toEqual([104, 101, 108, 108, 111]);
    expect(decodeBase64('').length).toBe(0);
  });

  test('a stored clip splits into its init, ftyp included, and its fragments', () => {
    const split = splitClipFile(clipBytes());
    expect(split).not.toBeNull();
    if (!split) return;
    expect(split.track?.codec).toBe('avc1.4d401f');
    expect(split.fragments).toHaveLength(2);
    expect(split.fragments[0]?.keyframe).toBe(true);
    expect(split.fragments[1]?.keyframe).toBe(false);
    const types: string[] = [];
    for (let at = 0; at < split.init.length;) {
      const size = new DataView(split.init.buffer, split.init.byteOffset + at, 4).getUint32(0);
      types.push(new TextDecoder().decode(split.init.subarray(at + 4, at + 8)));
      at += size;
    }
    expect(types).toEqual(['ftyp', 'moov']);
    expect(
      new TextDecoder().decode(split.fragments[0]?.bytes.subarray(4, 8) ?? new Uint8Array())
    ).toBe('moof');
  });

  test('a stream without an init segment is refused', () => {
    expect(splitClipFile(new Uint8Array(fragment(1, SYNC, [1, 2, 3])))).toBeNull();
  });

  test('pacing spreads the fragments over the clip duration', () => {
    const split = splitClipFile(clipBytes());
    if (!split) throw new Error('split');
    expect(clipDurationMs(split.fragments)).toBe(0);
    const steps = clipPaceSteps(split.fragments, 0);
    expect(steps.map((step) => step.index)).toEqual([0, 1]);
    expect(steps[0]?.atMs).toBe(0);
    expect(steps[1]?.atMs).toBe(0);
  });
});

describe('clip rows', () => {
  const payload: ICameraClips = {
    cameraId: 4,
    clips: [
      {
        id: 9,
        cameraId: 4,
        trigger: 'motion',
        contentType: 'video/mp4',
        codec: 'h264',
        startedAt: 1700000000,
        durationMs: 21000,
        byteSize: 4_500_000,
        createdAt: 1700000021,
        expiresAt: 1700604821,
      },
      {
        id: 8,
        cameraId: 4,
        trigger: 'event',
        contentType: 'video/mp4',
        codec: 'h264',
        startedAt: 1699990000,
        durationMs: 25000,
        byteSize: 900_000,
        createdAt: 1699990025,
        expiresAt: 1700594825,
      },
    ],
  };

  test('rows normalize to string ids and keep their trigger', () => {
    const rows = clipRowsOf(payload);
    expect(rows.map((row) => row.id)).toEqual(['9', '8']);
    expect(rows[0]?.cameraId).toBe('4');
    expect(rows[0]?.trigger).toBe('motion');
    expect(clipRowsOf(null)).toEqual([]);
    expect(clipRowsOf({ cameraId: 4, clips: [] })).toEqual([]);
    expect(clipOfRow({ id: 0, cameraId: 4 })).toBeNull();
    expect(clipOfRow({ id: 3, cameraId: 4, trigger: 'bogus' })?.trigger).toBe('event');
  });

  test('tamper and look clips keep their trigger, and their pictures read as images', () => {
    const frame = clipOfRow({
      id: 5,
      cameraId: 4,
      trigger: 'tamper',
      contentType: 'image/jpeg',
      durationMs: 0,
    });
    const crop = clipOfRow({ id: 6, cameraId: 4, trigger: 'look', contentType: 'image/jpeg' });
    const video = clipOfRow({ id: 7, cameraId: 4, trigger: 'tamper', contentType: 'video/mp4' });
    expect(frame?.trigger).toBe('tamper');
    expect(crop?.trigger).toBe('look');
    expect(frame && isImageClip(frame)).toBe(true);
    expect(video && isImageClip(video)).toBe(false);
    expect(clipTriggerLabelKey('tamper')).toBe('screens.cameras.clips.trigger.tamper');
    expect(clipTriggerLabelKey('look')).toBe('screens.cameras.clips.trigger.look');
    expect(clipImageUri('image/jpeg', 'AAAA')).toBe('data:image/jpeg;base64,AAAA');
  });

  test('labels carry the clip numbers the row holds', () => {
    const rows = clipRowsOf(payload);
    const clip = rows[0];
    if (!clip) throw new Error('row');
    expect(formatClipDuration(clip.durationMs)).toBe('0:21');
    expect(formatClipDuration(-5)).toBe('0:00');
    expect(formatClipSize(clip.byteSize)).toBe('4.3 MB');
    expect(formatClipSize(900_000)).toBe('879 KB');
    expect(formatClipSize(0)).toBe('');
    expect(clipTriggerLabelKey('continuous')).toBe('screens.cameras.clips.trigger.continuous');
    expect(clipFacts(t, clip)).toBe('0:21 · 4.3 MB · screens.cameras.clips.trigger.motion');
    expect(clipDetail(clip, 'hoy 14:02')).toBe('hoy 14:02 · 0:21');
    const still = { ...clip, trigger: 'tamper' as const, contentType: 'image/jpeg', durationMs: 0 };
    expect(clipFacts(t, still)).toBe(
      'screens.cameras.clips.still · 4.3 MB · screens.cameras.clips.trigger.tamper'
    );
    expect(clipGlyph(still)).toBe('image');
    expect(clipGlyph(clip)).toBe('play');
  });
});

describe('record modes', () => {
  test('every mode carries a label and only off stops recording', () => {
    expect(recordModeOptions()).toEqual(['events', 'motion', 'continuous', 'off']);
    expect(recordModeLabelKey('off')).toBe('screens.cameras.form.record-off');
    expect(recordModeLabelKey('motion')).toBe('screens.cameras.form.record-motion');
    expect(recordModeLabelKey('continuous')).toBe('screens.cameras.form.record-continuous');
    expect(recordModeLabelKey('events')).toBe('screens.cameras.form.record-events');
    expect(recordsSomething('off')).toBe(false);
    expect(recordsSomething('motion')).toBe(true);
  });

  test('a feed scope names a camera or every camera, and the camera is a filter of the one route', () => {
    expect(clipFeedScope(null)).toBe(CLIP_FEED_ALL);
    expect(clipFeedScope('4')).toBe('camera:4');
    expect(clipFeedCamera('camera:4')).toBe('4');
    expect(clipFeedCamera(CLIP_FEED_ALL)).toBeNull();
    expect(clipFeedPath(CLIP_FEED_ALL, null, 24)).toBe('/camera/clips?limit=24&cursor=');
    expect(clipFeedPath('camera:4', 'abc=', 24)).toBe(
      '/camera/clips?limit=24&cursor=abc%3D&cameraId=4'
    );
  });

  test('a page with more carries its opaque cursor, the last page ends the feed', () => {
    const wire = {
      hasMore: true,
      nextCursor: 'opaque',
      items: [
        { id: 3, cameraId: 1, createdAt: 100 },
        { id: 9, cameraId: 2, createdAt: 300 },
        { id: 4, cameraId: 1, createdAt: 300 },
      ],
    };
    const full = clipPageOf(wire);
    expect(full.rows.map((clip) => clip.id)).toEqual(['9', '4', '3']);
    expect(full.next).toBe('opaque');
    expect(clipPageOf({ ...wire, hasMore: false }).next).toBeNull();
    expect(clipPageOf({ ...wire, nextCursor: null }).next).toBeNull();
    expect(clipPageOf('nonsense')).toEqual({ rows: [], next: null });
    expect([...full.rows].sort(compareClips)[0]?.id).toBe('9');
  });

  test('only the clips of a known camera are shown', () => {
    const rows = clipRowsOf({
      clips: [
        { id: 1, cameraId: 1 },
        { id: 2, cameraId: 7 },
      ],
    });
    expect(visibleClips(rows, new Map([['1', 'Cocina']])).map((clip) => clip.id)).toEqual(['1']);
  });

  test('a poster answer is read or refused', () => {
    expect(clipContentOf({ base64: 'AAAA' })).toEqual({
      mimeType: 'image/jpeg',
      base64: 'AAAA',
      durationMs: 0,
    });
    expect(clipContentOf({ base64: '' })).toBeNull();
    expect(clipContentOf(null)).toBeNull();
  });

  test('the moment reads today, yesterday or the day, and the grid fills rows left to right', () => {
    const now = new Date(2026, 9, 27, 18, 0).getTime();
    const moment = (at: number) =>
      clipMoment({
        at,
        now,
        t: ((key: string, params?: { time?: string }) =>
          `${key}:${params?.time ?? ''}`) as unknown as TranslateFn,
        time: () => '14:02',
        day: () => '25 oct',
      });
    expect(moment(new Date(2026, 9, 27, 14, 2).getTime())).toBe(
      'screens.cameras.clips.today-at:14:02'
    );
    expect(moment(new Date(2026, 9, 26, 14, 2).getTime())).toBe(
      'screens.cameras.clips.yesterday-at:14:02'
    );
    expect(moment(new Date(2026, 9, 25, 14, 2).getTime())).toBe(
      'screens.cameras.clips.day-at:14:02'
    );
    expect(clipColumns(400, 560, 1400)).toBe(2);
    expect(clipColumns(700, 560, 1400)).toBe(3);
    expect(clipColumns(1500, 560, 1400)).toBe(4);
    expect(clipGridRows([1, 2, 3], 2)).toEqual([
      [1, 2],
      [3, null],
    ]);
  });
});
