export const SYNC = 0x02000000;
export const DELTA = 0x01010000;

export function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

export function box(type: string, body: number[]): number[] {
  return [...be32(body.length + 8), ...ascii(type), ...body];
}

export function zeros(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

export function videoTrak(trackId: number, timescale: number): number[] {
  const tkhd = box('tkhd', [...be32(0), ...be32(0), ...be32(0), ...be32(trackId), ...be32(0)]);
  const mdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(timescale), ...be32(0)]);
  const hdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('vide'), ...be32(0)]);
  const avcC = box('avcC', [1, 0x4d, 0x40, 0x1f, 0xff]);
  const avc1 = box('avc1', [...zeros(78), ...avcC]);
  const stsd = box('stsd', [...be32(0), ...be32(1), ...avc1]);
  const minf = box('minf', box('stbl', stsd));
  return box('trak', [...tkhd, ...box('mdia', [...mdhd, ...hdlr, ...minf])]);
}

export function initSegment(traks: number[][]): Uint8Array {
  return new Uint8Array([
    ...box('ftyp', ascii('iso5')),
    ...box('moov', [...box('mvhd', be32(0)), ...traks.flat()]),
  ]);
}

export type FragmentSpec = { track: number; flags: number; payload: number[]; decodeTime?: number };

export function fragmentOf({
  track,
  flags,
  payload,
  decodeTime = 90000,
}: FragmentSpec): Uint8Array {
  const tfhd = box('tfhd', [
    ...be32(0x020038),
    ...be32(track),
    ...be32(3000),
    ...be32(payload.length),
    ...be32(flags),
  ]);
  const tfdt = box('tfdt', [...be32(0x01000000), ...be32(0), ...be32(decodeTime)]);
  const trunBody = [...be32(0x000001), ...be32(1), ...be32(0)];
  const traf = box('traf', [...tfhd, ...tfdt, ...box('trun', trunBody)]);
  const moof = box('moof', [...box('mfhd', [...be32(0), ...be32(1)]), ...traf]);
  const offset = moof.length + 8;
  const patched = [...moof];
  patched.splice(patched.length - 4, 4, ...be32(offset));
  return new Uint8Array([...patched, ...box('mdat', payload)]);
}

export function fragment(track: number, flags: number, payload: number[]): Uint8Array {
  return fragmentOf({ track, flags, payload });
}

export const FLAC_RATE = 8000;

export function streamInfo(): number[] {
  const blockSize = 512;
  const packed = (BigInt(FLAC_RATE) << 44n) | (0n << 41n) | (15n << 36n);
  const tail = Array.from({ length: 8 }, (_, index) =>
    Number((packed >> BigInt(56 - index * 8)) & 0xffn)
  );
  return [
    blockSize >> 8,
    blockSize & 0xff,
    blockSize >> 8,
    blockSize & 0xff,
    ...zeros(6),
    ...tail,
    ...zeros(16),
  ];
}

export function dfLaBox(): number[] {
  return box('dfLa', [...be32(0), 0x80, 0, 0, 34, ...streamInfo()]);
}

export function flacTrak(trackId: number): number[] {
  const tkhd = box('tkhd', [...be32(0), ...be32(0), ...be32(0), ...be32(trackId), ...be32(0)]);
  const mdhd = box('mdhd', [...be32(0), ...be32(0), ...be32(0), ...be32(FLAC_RATE), ...be32(0)]);
  const hdlr = box('hdlr', [...be32(0), ...be32(0), ...ascii('soun'), ...be32(0)]);
  const entry = box('fLaC', [
    ...zeros(6),
    0,
    1,
    ...zeros(8),
    0,
    1,
    0,
    16,
    ...zeros(4),
    ...be32(FLAC_RATE << 16),
    ...dfLaBox(),
  ]);
  const stsd = box('stsd', [...be32(0), ...be32(1), ...entry]);
  const minf = box('minf', box('stbl', stsd));
  return box('trak', [...tkhd, ...box('mdia', [...mdhd, ...hdlr, ...minf])]);
}
