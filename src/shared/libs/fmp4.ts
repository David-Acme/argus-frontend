/** Minimal fragmented-MP4 reader for the gateway camera feed (H.264, one track). */

export type Fmp4Init = {
  codec: string;
  description: Uint8Array;
  timescale: number;
};

export type Fmp4Sample = {
  data: Uint8Array;
  timestampUs: number;
  durationUs: number;
  isKey: boolean;
};

type Box = {
  type: string;
  start: number;
  end: number;
  contentStart: number;
};

const NON_SYNC_FLAG = 0x00010000;

export function parseInit(bytes: Uint8Array): Fmp4Init | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const moov = boxes(view, 0, bytes.byteLength).find(
    (box) => box.type === 'moov',
  );
  if (!moov) return null;

  let timescale = 0;
  let description: Uint8Array | null = null;
  let codec = '';

  for (const trak of boxes(view, moov.contentStart, moov.end)) {
    if (trak.type !== 'trak') continue;
    const mdia = boxes(view, trak.contentStart, trak.end).find(
      (box) => box.type === 'mdia',
    );
    if (!mdia) continue;
    const mdiaBoxes = boxes(view, mdia.contentStart, mdia.end);

    const mdhd = mdiaBoxes.find((box) => box.type === 'mdhd');
    if (mdhd) {
      const version = view.getUint8(mdhd.contentStart);
      timescale = view.getUint32(
        mdhd.contentStart + (version === 1 ? 20 : 12),
      );
    }

    const minf = mdiaBoxes.find((box) => box.type === 'minf');
    if (!minf) continue;
    const stbl = boxes(view, minf.contentStart, minf.end).find(
      (box) => box.type === 'stbl',
    );
    if (!stbl) continue;
    const stsd = boxes(view, stbl.contentStart, stbl.end).find(
      (box) => box.type === 'stsd',
    );
    if (!stsd) continue;

    for (const entry of boxes(view, stsd.contentStart + 8, stsd.end)) {
      if (entry.type !== 'avc1' && entry.type !== 'avc3') continue;
      const avcC = boxes(view, entry.contentStart + 78, entry.end).find(
        (box) => box.type === 'avcC',
      );
      if (!avcC) continue;
      const profile = view.getUint8(avcC.contentStart + 1);
      const compatibility = view.getUint8(avcC.contentStart + 2);
      const level = view.getUint8(avcC.contentStart + 3);
      const hex = (value: number) => value.toString(16).padStart(2, '0');
      codec = `avc1.${hex(profile)}${hex(compatibility)}${hex(level)}`;
      description = bytes.slice(avcC.contentStart, avcC.end);
    }
  }

  if (!description || timescale <= 0 || !codec) return null;
  return { codec, description, timescale };
}

export function parseFragment(
  bytes: Uint8Array,
  timescale: number,
): Fmp4Sample[] {
  if (timescale <= 0) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const top = boxes(view, 0, bytes.byteLength);
  const moof = top.find((box) => box.type === 'moof');
  const mdat = top.find((box) => box.type === 'mdat');
  if (!moof || !mdat) return [];
  const traf = boxes(view, moof.contentStart, moof.end).find(
    (box) => box.type === 'traf',
  );
  if (!traf) return [];

  let defaultDuration = 0;
  let defaultSize = 0;
  let defaultFlags = 0;
  let baseDecodeTime = 0;
  let dataOffset = 0;
  let firstSampleFlags: number | null = null;
  const planned: {
    duration: number;
    size: number;
    flags: number;
    compositionOffset: number;
  }[] = [];

  for (const box of boxes(view, traf.contentStart, traf.end)) {
    if (box.type === 'tfhd') {
      const flags = view.getUint32(box.contentStart) & 0x00ffffff;
      let offset = box.contentStart + 8;
      if (flags & 0x1) offset += 8;
      if (flags & 0x2) offset += 4;
      if (flags & 0x8) {
        defaultDuration = view.getUint32(offset);
        offset += 4;
      }
      if (flags & 0x10) {
        defaultSize = view.getUint32(offset);
        offset += 4;
      }
      if (flags & 0x20) {
        defaultFlags = view.getUint32(offset);
        offset += 4;
      }
    } else if (box.type === 'tfdt') {
      const version = view.getUint8(box.contentStart);
      baseDecodeTime =
        version === 1
          ? Number(view.getBigUint64(box.contentStart + 4))
          : view.getUint32(box.contentStart + 4);
    } else if (box.type === 'trun') {
      const flags = view.getUint32(box.contentStart) & 0x00ffffff;
      const count = view.getUint32(box.contentStart + 4);
      let offset = box.contentStart + 8;
      if (flags & 0x1) {
        dataOffset = view.getInt32(offset);
        offset += 4;
      }
      if (flags & 0x4) {
        firstSampleFlags = view.getUint32(offset);
        offset += 4;
      }
      for (let index = 0; index < count; index += 1) {
        let duration = defaultDuration;
        let size = defaultSize;
        let sampleFlags = defaultFlags;
        let compositionOffset = 0;
        if (flags & 0x100) {
          duration = view.getUint32(offset);
          offset += 4;
        }
        if (flags & 0x200) {
          size = view.getUint32(offset);
          offset += 4;
        }
        if (flags & 0x400) {
          sampleFlags = view.getUint32(offset);
          offset += 4;
        }
        if (flags & 0x800) {
          compositionOffset = view.getInt32(offset);
          offset += 4;
        }
        if (index === 0 && firstSampleFlags != null)
          sampleFlags = firstSampleFlags;
        planned.push({ duration, size, flags: sampleFlags, compositionOffset });
      }
    }
  }

  const start = dataOffset !== 0 ? moof.start + dataOffset : mdat.contentStart;
  const samples: Fmp4Sample[] = [];
  let cursor = start;
  let decodeTime = baseDecodeTime;
  for (const plan of planned) {
    const end = cursor + plan.size;
    if (end > bytes.byteLength) break;
    samples.push({
      data: bytes.subarray(cursor, end),
      timestampUs: toMicros(
        decodeTime + plan.compositionOffset,
        timescale,
      ),
      durationUs: toMicros(plan.duration, timescale),
      isKey: (plan.flags & NON_SYNC_FLAG) === 0,
    });
    cursor = end;
    decodeTime += plan.duration;
  }
  return samples;
}

function toMicros(value: number, timescale: number): number {
  return Math.round((value * 1_000_000) / timescale);
}

function boxes(view: DataView, from: number, to: number): Box[] {
  const result: Box[] = [];
  let offset = from;
  while (offset + 8 <= to) {
    const size = view.getUint32(offset);
    const type = fourCc(view, offset + 4);
    let end: number;
    if (size === 1 && offset + 16 <= to)
      end = offset + Number(view.getBigUint64(offset + 8));
    else if (size === 0) end = to;
    else end = offset + size;
    if (end > to || end <= offset) break;
    result.push({
      type,
      start: offset,
      end,
      contentStart: size === 1 ? offset + 16 : offset + 8,
    });
    offset = end;
  }
  return result;
}

function fourCc(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
