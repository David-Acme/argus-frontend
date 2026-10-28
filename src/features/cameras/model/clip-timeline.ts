import { boxes, type Box } from '@/features/cameras/model/fmp4';

type DecodeTime = { offset: number; wide: boolean; trackId: number; value: number };

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const childOf = (view: DataView, parent: Box, type: string): Box | undefined =>
  boxes(view, parent.contentStart, parent.end).find((box) => box.type === type);

const fieldAfterTimes = (view: DataView, box: Box): number =>
  view.getUint32(box.contentStart + (view.getUint8(box.contentStart) === 1 ? 20 : 12));

export function trackClocks(init: Uint8Array): Map<number, number> {
  const view = viewOf(init);
  const clocks = new Map<number, number>();
  const moov = boxes(view, 0, init.byteLength).find((box) => box.type === 'moov');
  if (!moov) return clocks;
  for (const trak of boxes(view, moov.contentStart, moov.end)) {
    if (trak.type !== 'trak') continue;
    const tkhd = childOf(view, trak, 'tkhd');
    const mdia = childOf(view, trak, 'mdia');
    const mdhd = mdia ? childOf(view, mdia, 'mdhd') : undefined;
    if (!tkhd || !mdhd) continue;
    const timescale = fieldAfterTimes(view, mdhd);
    if (timescale > 0) clocks.set(fieldAfterTimes(view, tkhd), timescale);
  }
  return clocks;
}

function decodeTimesOf(fragment: Uint8Array): DecodeTime[] {
  const view = viewOf(fragment);
  const moof = boxes(view, 0, fragment.byteLength).find((box) => box.type === 'moof');
  if (!moof) return [];
  return boxes(view, moof.contentStart, moof.end).flatMap((traf) => {
    if (traf.type !== 'traf') return [];
    const tfhd = childOf(view, traf, 'tfhd');
    const tfdt = childOf(view, traf, 'tfdt');
    if (!tfhd || !tfdt) return [];
    const wide = view.getUint8(tfdt.contentStart) === 1;
    const offset = tfdt.contentStart + 4;
    const value = wide ? Number(view.getBigUint64(offset)) : view.getUint32(offset);
    return [{ offset, wide, trackId: view.getUint32(tfhd.contentStart + 4), value }];
  });
}

function writeDecodeTime(fragment: Uint8Array, time: DecodeTime, value: number): void {
  const view = viewOf(fragment);
  if (time.wide) view.setBigUint64(time.offset, BigInt(value));
  else view.setUint32(time.offset, value);
}

export function rebaseClipTimes(init: Uint8Array, fragments: readonly Uint8Array[]): void {
  const clocks = trackClocks(init);
  const times = fragments.map(decodeTimesOf);
  let startSeconds = Number.POSITIVE_INFINITY;
  for (const time of times.flat()) {
    const clock = clocks.get(time.trackId);
    if (clock) startSeconds = Math.min(startSeconds, time.value / clock);
  }
  if (!Number.isFinite(startSeconds) || startSeconds <= 0) return;
  times.forEach((list, index) => {
    const fragment = fragments[index];
    if (!fragment) return;
    for (const time of list) {
      const clock = clocks.get(time.trackId);
      if (!clock) continue;
      writeDecodeTime(fragment, time, Math.max(0, time.value - Math.round(startSeconds * clock)));
    }
  });
}
