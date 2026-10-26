import { describe, expect, test } from 'bun:test';
import type { ICameraClips } from '@/core/interfaces';
import {
  clipDurationMs,
  clipPaceSteps,
  decodeBase64,
  splitClipFile,
} from '@/features/cameras/model/clip-media';
import {
  clipImageUri,
  clipOfRow,
  clipRowSubtitle,
  clipRowsOf,
  clipSourceIds,
  clipTriggerLabelKey,
  formatClipDuration,
  formatClipSize,
  isImageClip,
  mergeClipPages,
  newestClips,
  olderClipCursor,
} from '@/features/cameras/model/camera-clips';
import {
  recordModeLabelKey,
  recordModeOptions,
  recordModeSummary,
  recordsSomething,
} from '@/features/cameras/model/camera-record-mode';
import type { TranslateFn } from '@/core/types';

const SYNC = 0x02000000;
const DELTA = 0x01010000;

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

function box(type: string, body: number[]): number[] {
  return [...be32(body.length + 8), ...ascii(type), ...body];
}

function zeros(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

function videoTrak(trackId: number, timescale: number): number[] {
  const tkhd = box('tkhd', [...be32(0), ...be32(0), ...be32(0), ...be32(trackId), ...be32(0)]);
  const mdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(timescale), ...be32(0)]);
  const hdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('vide'), ...be32(0)]);
  const avcC = box('avcC', [1, 0x4d, 0x40, 0x1f, 0xff]);
  const avc1 = box('avc1', [...zeros(78), ...avcC]);
  const stsd = box('stsd', [...be32(0), ...be32(1), ...avc1]);
  const minf = box('minf', box('stbl', stsd));
  return box('trak', [...tkhd, ...box('mdia', [...mdhd, ...hdlr, ...minf])]);
}

function initSegment(traks: number[][]): Uint8Array {
  return new Uint8Array([...box('ftyp', ascii('iso5')), ...box('moov', [...box('mvhd', be32(0)), ...traks.flat()])]);
}

function fragment(track: number, flags: number, payload: number[]): Uint8Array {
  const tfhd = box('tfhd', [...be32(0x020038), ...be32(track), ...be32(3000), ...be32(payload.length), ...be32(flags)]);
  const tfdt = box('tfdt', [...be32(0x01000000), ...be32(0), ...be32(90000)]);
  const trunBody = [...be32(0x000001), ...be32(1), ...be32(0)];
  const traf = box('traf', [...tfhd, ...tfdt, ...box('trun', trunBody)]);
  const moof = box('moof', [...box('mfhd', [...be32(0), ...be32(1)]), ...traf]);
  const offset = moof.length + 8;
  const patched = [...moof];
  patched.splice(patched.length - 4, 4, ...be32(offset));
  return new Uint8Array([...patched, ...box('mdat', payload)]);
}

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

  test('a stored clip splits into its init and its fragments', () => {
    const split = splitClipFile(clipBytes());
    expect(split).not.toBeNull();
    if (!split) return;
    expect(split.track?.codec).toBe('avc1.4d401f');
    expect(split.fragments).toHaveLength(2);
    expect(split.fragments[0]?.keyframe).toBe(true);
    expect(split.fragments[1]?.keyframe).toBe(false);
    expect(new TextDecoder().decode(split.init.subarray(4, 8))).toBe('moov');
    expect(new TextDecoder().decode(split.fragments[0]?.bytes.subarray(4, 8) ?? new Uint8Array())).toBe('moof');
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
    const frame = clipOfRow({ id: 5, cameraId: 4, trigger: 'tamper', contentType: 'image/jpeg', durationMs: 0 });
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

  test('pages merge once and the cursor walks backwards from the oldest row', () => {
    const first = clipRowsOf(payload);
    const page: ICameraClips = {
      cameraId: 4,
      clips: [
        { ...payload.clips[1]!, id: 8 },
        { ...payload.clips[1]!, id: 7 },
      ],
    };
    const merged = mergeClipPages(first, clipRowsOf(page));
    expect(merged.map((row) => row.id)).toEqual(['9', '8', '7']);
    expect(olderClipCursor(merged)).toEqual({ before: 1699990025, beforeId: 7 });
    expect(olderClipCursor([])).toBeNull();
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
    expect(clipRowSubtitle(t, clip, '12 oct')).toBe('12 oct · 0:21 · 4.3 MB · screens.cameras.clips.trigger.motion');
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
    expect(recordModeSummary()).toEqual({ off: 0, motion: 0, events: 0, continuous: 0 });
  });

  test('the newest clips across cameras come first, a tie broken by the higher id', () => {
    const rows = clipRowsOf({
      cameraId: 0,
      clips: [
        { id: 3, cameraId: 1, startedAt: 100 },
        { id: 9, cameraId: 2, startedAt: 300 },
        { id: 4, cameraId: 1, startedAt: 300 },
      ] as unknown as ICameraClips['clips'],
    });
    expect(newestClips(rows, 2).map((clip) => clip.id)).toEqual(['9', '4']);
  });

  test('clips are read only from enabled, saved cameras outside privacy', () => {
    const camera = { isEnabled: true, privacyState: 'off' as const, privacyObeyed: false };
    expect(
      clipSourceIds([
        { ...camera, id: '1' },
        { ...camera, id: '2', isEnabled: false },
        { ...camera, id: '3', privacyState: 'on' },
      ])
    ).toEqual(['1']);
  });
});
