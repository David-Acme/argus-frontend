import type { PlayerSource } from '@/shared/ui/media';
import {
  decodeBase64,
  splitClipFile,
  type ClipFile,
  type ClipFragment,
} from '@/features/cameras/model/clip-media';

export type ClipSegment = { first: number; last: number; startUs: number; endUs: number };

const SIDX_HEADER_BYTES = 44;

const SIDX_REFERENCE_BYTES = 12;

const STARTS_WITH_SAP = 0x90000000;

const startsSegment = (fragment: ClipFragment, index: number): boolean =>
  index === 0 || (fragment.video && fragment.keyframe);

export function clipSegments(fragments: readonly ClipFragment[]): ClipSegment[] {
  const starts = fragments.flatMap((fragment, index) =>
    startsSegment(fragment, index) ? [index] : []
  );
  const endUs = fragments.reduce((end, fragment) => Math.max(end, fragment.endUs), 0);
  return starts.map((first, at) => {
    const next = starts[at + 1];
    return {
      first,
      last: (next ?? fragments.length) - 1,
      startUs: fragments[first]?.atUs ?? 0,
      endUs: next === undefined ? endUs : (fragments[next]?.atUs ?? endUs),
    };
  });
}

const ticks = (us: number, timescale: number): number => Math.round((us * timescale) / 1_000_000);

function segmentBytes(fragments: readonly ClipFragment[], segment: ClipSegment): number {
  let total = 0;
  for (let index = segment.first; index <= segment.last; index += 1)
    total += fragments[index]?.bytes.byteLength ?? 0;
  return total;
}

type SidxInput = { fragments: readonly ClipFragment[]; trackId: number; timescale: number };

export function sidxBox({ fragments, trackId, timescale }: SidxInput): Uint8Array {
  const segments = clipSegments(fragments);
  const bytes = new Uint8Array(SIDX_HEADER_BYTES + segments.length * SIDX_REFERENCE_BYTES);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.byteLength);
  bytes.set([0x73, 0x69, 0x64, 0x78], 4);
  view.setUint32(8, 0x01000000);
  view.setUint32(12, trackId);
  view.setUint32(16, timescale);
  view.setBigUint64(20, BigInt(ticks(segments[0]?.startUs ?? 0, timescale)));
  view.setBigUint64(28, 0n);
  view.setUint16(38, segments.length);
  segments.forEach((segment, at) => {
    const offset = SIDX_HEADER_BYTES + at * SIDX_REFERENCE_BYTES;
    view.setUint32(offset, segmentBytes(fragments, segment) & 0x7fffffff);
    view.setUint32(offset + 4, ticks(segment.endUs - segment.startUs, timescale));
    view.setUint32(offset + 8, STARTS_WITH_SAP);
  });
  return bytes;
}

export function seekableClip(file: ClipFile): Uint8Array {
  const index = file.track
    ? sidxBox({
        fragments: file.fragments,
        trackId: file.track.trackId,
        timescale: file.track.timescale,
      })
    : new Uint8Array();
  const total =
    file.init.byteLength +
    index.byteLength +
    file.fragments.reduce((sum, fragment) => sum + fragment.bytes.byteLength, 0);
  const out = new Uint8Array(total);
  out.set(file.init, 0);
  out.set(index, file.init.byteLength);
  let offset = file.init.byteLength + index.byteLength;
  for (const fragment of file.fragments) {
    out.set(fragment.bytes, offset);
    offset += fragment.bytes.byteLength;
  }
  return out;
}

export function clipLengthMs(file: ClipFile): number {
  const segments = clipSegments(file.fragments);
  const first = segments[0];
  const last = segments.at(-1);
  return first && last ? Math.round((last.endUs - first.startUs) / 1000) : 0;
}

export function clipPlayerSource(key: string, base64: string): PlayerSource | null {
  const file = splitClipFile(decodeBase64(base64));
  if (!file) return null;
  const bytes = seekableClip(file);
  return {
    key,
    data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}
