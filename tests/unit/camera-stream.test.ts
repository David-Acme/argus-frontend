import { describe, expect, test } from 'bun:test';
import { parseFragment, parseInit } from '@/features/cameras/model/fmp4';
import { FragmentAssembler } from '@/features/cameras/model/fragment-assembler';
import { isStalled, refusalOf, retryDelayMs, stateAfterFailure } from '@/features/cameras/model/stream-recovery';

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

function audioTrak(trackId: number, timescale: number): number[] {
  const tkhd = box('tkhd', [...be32(0), ...be32(0), ...be32(0), ...be32(trackId), ...be32(0)]);
  const mdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(timescale), ...be32(0)]);
  const hdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('soun'), ...be32(0)]);
  return box('trak', [...tkhd, ...box('mdia', [...mdhd, ...hdlr])]);
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
  const trunOffsetAt = patched.length - 4;
  patched.splice(trunOffsetAt, 4, ...be32(offset));
  return new Uint8Array([...patched, ...box('mdat', payload)]);
}

describe('fmp4 parsing', () => {
  test('the init picks the video track even when the audio track comes last', () => {
    const init = parseInit(initSegment([videoTrak(1, 90000), audioTrak(2, 8000)]));
    expect(init).not.toBeNull();
    expect(init?.trackId).toBe(1);
    expect(init?.timescale).toBe(90000);
    expect(init?.codec).toBe('avc1.4d401f');
  });

  test('the init finds a video track that comes second', () => {
    const init = parseInit(initSegment([audioTrak(1, 8000), videoTrak(2, 90000)]));
    expect(init?.trackId).toBe(2);
  });

  test('audio fragments yield no video samples and video keyframes keep their flag', () => {
    const init = parseInit(initSegment([videoTrak(1, 90000), audioTrak(2, 8000)]));
    if (!init) throw new Error('init');
    expect(parseFragment(fragment(2, SYNC, [9, 9, 9]), init)).toEqual([]);
    const key = parseFragment(fragment(1, SYNC, [1, 2, 3, 4]), init);
    expect(key).toHaveLength(1);
    expect(key[0]?.isKey).toBe(true);
    expect(Array.from(key[0]?.data ?? [])).toEqual([1, 2, 3, 4]);
    expect(key[0]?.timestampUs).toBe(1_000_000);
    const delta = parseFragment(fragment(1, DELTA, [5, 6]), init);
    expect(delta[0]?.isKey).toBe(false);
  });
});

describe('fragment assembler', () => {
  test('a fragment split across messages comes out whole once', () => {
    const whole = fragment(1, SYNC, Array.from({ length: 40000 }, (_, index) => index & 0xff));
    const assembler = new FragmentAssembler();
    const out = [
      ...assembler.push(whole.subarray(0, 16384)),
      ...assembler.push(whole.subarray(16384, 32768)),
    ];
    expect(out).toHaveLength(0);
    out.push(...assembler.push(whole.subarray(32768)));
    expect(out).toHaveLength(1);
    expect(out[0]?.byteLength).toBe(whole.byteLength);
    expect(Array.from(out[0] ?? []).slice(-3)).toEqual(Array.from(whole.subarray(-3)));
    expect(assembler.pendingBytes()).toBe(0);
  });

  test('two fragments in one message and a partial third are split correctly', () => {
    const first = fragment(1, SYNC, [1, 2]);
    const second = fragment(2, SYNC, [3]);
    const third = fragment(1, DELTA, [4, 5, 6]);
    const joined = new Uint8Array([...first, ...second, ...third.subarray(0, 10)]);
    const assembler = new FragmentAssembler();
    const out = assembler.push(joined);
    expect(out.map((part) => part.byteLength)).toEqual([first.byteLength, second.byteLength]);
    expect(assembler.pendingBytes()).toBe(10);
    expect(assembler.push(third.subarray(10)).map((part) => part.byteLength)).toEqual([third.byteLength]);
  });

  test('a corrupt box size resets instead of buffering for ever', () => {
    const assembler = new FragmentAssembler();
    expect(assembler.push(new Uint8Array([0, 0, 0, 2, ...ascii('moof')]))).toEqual([]);
    expect(assembler.pendingBytes()).toBe(0);
  });

  test('a 64-bit box header waits for its sixteen bytes', () => {
    const assembler = new FragmentAssembler();
    expect(assembler.push(new Uint8Array([0, 0, 0, 1, ...ascii('mdat'), 0, 0]))).toEqual([]);
    expect(assembler.pendingBytes()).toBe(10);
  });
});

describe('live stream recovery', () => {
  test('subscribe refusals split into final, busy and retry', () => {
    expect(refusalOf(404)).toBe('final');
    expect(refusalOf(403)).toBe('final');
    expect(refusalOf(429)).toBe('busy');
    expect(refusalOf(503)).toBe('retry');
    expect(refusalOf(undefined)).toBe('retry');
  });

  test('retries back off and a camera reads offline after three misses', () => {
    expect(retryDelayMs(1, 'retry', 0)).toBe(1000);
    expect(retryDelayMs(2, 'retry', 0)).toBe(2000);
    expect(retryDelayMs(10, 'retry', 0)).toBe(15000);
    expect(retryDelayMs(1, 'retry', 1)).toBe(800);
    expect(retryDelayMs(1, 'busy', 0)).toBe(10000);
    expect(stateAfterFailure(1)).toBe('reconnecting');
    expect(stateAfterFailure(3)).toBe('offline');
  });

  test('a stream that stops sending is stalled', () => {
    expect(isStalled(0, 10000, 8000)).toBe(false);
    expect(isStalled(1000, 8000, 8000)).toBe(false);
    expect(isStalled(1000, 9000, 8000)).toBe(true);
  });
});
