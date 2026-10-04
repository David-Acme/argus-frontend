export type Fmp4Init = {
  codec: string;
  description: Uint8Array;
  timescale: number;
  trackId: number;
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

export type Fmp4AudioTrack = {
  codec: string;
  trackId: number;
  timescale: number;
  sampleRate: number;
  channels: number;
};

const NON_SYNC_FLAG = 0x00010000;

export function parseAudioInit(bytes: Uint8Array): Fmp4AudioTrack | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const moov = boxes(view, 0, bytes.byteLength).find((box) => box.type === 'moov');
  if (!moov) return null;
  for (const trak of boxes(view, moov.contentStart, moov.end)) {
    if (trak.type !== 'trak') continue;
    const trakBoxes = boxes(view, trak.contentStart, trak.end);
    const tkhd = trakBoxes.find((box) => box.type === 'tkhd');
    const mdia = trakBoxes.find((box) => box.type === 'mdia');
    if (!tkhd || !mdia) continue;
    const mdiaBoxes = boxes(view, mdia.contentStart, mdia.end);
    const hdlr = mdiaBoxes.find((box) => box.type === 'hdlr');
    const mdhd = mdiaBoxes.find((box) => box.type === 'mdhd');
    if (!hdlr || !mdhd || fourCc(view, hdlr.contentStart + 8) !== 'soun') continue;
    const trackId = view.getUint32(tkhd.contentStart + (view.getUint8(tkhd.contentStart) === 1 ? 20 : 12));
    const timescale = view.getUint32(mdhd.contentStart + (view.getUint8(mdhd.contentStart) === 1 ? 20 : 12));
    const minf = mdiaBoxes.find((box) => box.type === 'minf');
    const stbl = minf ? boxes(view, minf.contentStart, minf.end).find((box) => box.type === 'stbl') : undefined;
    const stsd = stbl ? boxes(view, stbl.contentStart, stbl.end).find((box) => box.type === 'stsd') : undefined;
    const entry = stsd ? boxes(view, stsd.contentStart + 8, stsd.end)[0] : undefined;
    if (!entry || timescale <= 0) continue;
    const channels = view.getUint16(entry.contentStart + 16);
    const sampleRate = view.getUint32(entry.contentStart + 24) >>> 16;
    return { codec: entry.type, trackId, timescale, sampleRate: sampleRate || timescale, channels: channels || 1 };
  }
  return null;
}

export function parseInit(bytes: Uint8Array): Fmp4Init | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const moov = boxes(view, 0, bytes.byteLength).find((box) => box.type === 'moov');
  if (!moov) return null;

  for (const trak of boxes(view, moov.contentStart, moov.end)) {
    if (trak.type !== 'trak') continue;
    const video = parseVideoTrack(view, bytes, trak);
    if (video) return video;
  }
  return null;
}

function parseVideoTrack(view: DataView, bytes: Uint8Array, trak: Box): Fmp4Init | null {
  const trakBoxes = boxes(view, trak.contentStart, trak.end);
  const tkhd = trakBoxes.find((box) => box.type === 'tkhd');
  const mdia = trakBoxes.find((box) => box.type === 'mdia');
  if (!tkhd || !mdia) return null;
  const tkhdVersion = view.getUint8(tkhd.contentStart);
  const trackId = view.getUint32(tkhd.contentStart + (tkhdVersion === 1 ? 20 : 12));

  const mdiaBoxes = boxes(view, mdia.contentStart, mdia.end);
  const hdlr = mdiaBoxes.find((box) => box.type === 'hdlr');
  if (!hdlr || fourCc(view, hdlr.contentStart + 8) !== 'vide') return null;
  const mdhd = mdiaBoxes.find((box) => box.type === 'mdhd');
  if (!mdhd) return null;
  const mdhdVersion = view.getUint8(mdhd.contentStart);
  const timescale = view.getUint32(mdhd.contentStart + (mdhdVersion === 1 ? 20 : 12));

  const child = (parent: Box | undefined, type: string) =>
    parent ? boxes(view, parent.contentStart, parent.end).find((box) => box.type === type) : undefined;
  const stsd = child(child(child(mdia, 'minf'), 'stbl'), 'stsd');
  if (!stsd) return null;

  for (const entry of boxes(view, stsd.contentStart + 8, stsd.end)) {
    const config = sampleEntryConfig(view, bytes, entry);
    if (config && timescale > 0) return { ...config, timescale, trackId };
  }
  return null;
}

function sampleEntryConfig(
  view: DataView,
  bytes: Uint8Array,
  entry: Box,
): Pick<Fmp4Init, 'codec' | 'description'> | null {
  const children = boxes(view, entry.contentStart + 78, entry.end);
  if (entry.type === 'avc1' || entry.type === 'avc3') {
    const avcC = children.find((box) => box.type === 'avcC');
    if (!avcC) return null;
    const profile = view.getUint8(avcC.contentStart + 1);
    const compatibility = view.getUint8(avcC.contentStart + 2);
    const level = view.getUint8(avcC.contentStart + 3);
    return {
      codec: `${entry.type}.${hex(profile)}${hex(compatibility)}${hex(level)}`,
      description: bytes.slice(avcC.contentStart, avcC.end),
    };
  }
  if (entry.type === 'hvc1' || entry.type === 'hev1') {
    const hvcC = children.find((box) => box.type === 'hvcC');
    if (!hvcC) return null;
    return {
      codec: `${entry.type}.${hevcCodecSuffix(view, hvcC.contentStart)}`,
      description: bytes.slice(hvcC.contentStart, hvcC.end),
    };
  }
  return null;
}

function hevcCodecSuffix(view: DataView, start: number): string {
  const general = view.getUint8(start + 1);
  const space = ['', 'A', 'B', 'C'][general >> 6] ?? '';
  const tier = (general >> 5) & 1 ? 'H' : 'L';
  const profile = general & 0x1f;
  const compatibility = view.getUint32(start + 2);
  let reversed = 0;
  for (let bit = 0; bit < 32; bit += 1) reversed = (reversed << 1) | ((compatibility >>> bit) & 1);
  const constraints: string[] = [];
  for (let index = 0; index < 6; index += 1) constraints.push(view.getUint8(start + 6 + index).toString(16));
  while (constraints.length > 0 && constraints[constraints.length - 1] === '0') constraints.pop();
  const level = view.getUint8(start + 12);
  return [`${space}${profile}`, (reversed >>> 0).toString(16), `${tier}${level}`, ...constraints].join('.');
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function parseFragment(
  bytes: Uint8Array,
  track: Pick<Fmp4Init, 'timescale' | 'trackId'>,
): Fmp4Sample[] {
  const { timescale, trackId } = track;
  if (timescale <= 0) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const top = boxes(view, 0, bytes.byteLength);
  const moof = top.find((box) => box.type === 'moof');
  const mdat = top.find((box) => box.type === 'mdat');
  if (!moof || !mdat) return [];
  const traf = boxes(view, moof.contentStart, moof.end).find(
    (box) => box.type === 'traf' && trafTrackId(view, box) === trackId,
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

function trafTrackId(view: DataView, traf: Box): number | null {
  const tfhd = boxes(view, traf.contentStart, traf.end).find((box) => box.type === 'tfhd');
  return tfhd ? view.getUint32(tfhd.contentStart + 4) : null;
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
