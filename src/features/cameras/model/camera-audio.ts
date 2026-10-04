const FLAC_SYNC = 0xfff8;
const VERBATIM_16_MONO = 0x02;

function utf8Length(first: number): number {
  if ((first & 0x80) === 0) return 1;
  if ((first & 0xe0) === 0xc0) return 2;
  if ((first & 0xf0) === 0xe0) return 3;
  if ((first & 0xf8) === 0xf0) return 4;
  if ((first & 0xfc) === 0xf8) return 5;
  if ((first & 0xfe) === 0xfc) return 6;
  return 7;
}

const FIXED_BLOCK_SIZES: Record<number, number> = {
  1: 192,
  2: 576,
  3: 1152,
  4: 2304,
  5: 4608,
  8: 256,
  9: 512,
  10: 1024,
  11: 2048,
  12: 4096,
  13: 8192,
  14: 16384,
  15: 32768,
};

export function decodeFlacFrame(frame: Uint8Array): Int16Array | null {
  if (frame.byteLength < 8) return null;
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  if ((view.getUint16(0) & 0xfffe) !== FLAC_SYNC) return null;
  const blockCode = view.getUint8(2) >> 4;
  const rateCode = view.getUint8(2) & 0x0f;
  const channelCode = view.getUint8(3) >> 4;
  const sizeCode = (view.getUint8(3) >> 1) & 0x07;
  if (channelCode !== 0 || (sizeCode !== 4 && sizeCode !== 0)) return null;
  let offset = 4 + utf8Length(view.getUint8(4));
  let blockSize = FIXED_BLOCK_SIZES[blockCode] ?? 0;
  if (blockCode === 6) {
    blockSize = view.getUint8(offset) + 1;
    offset += 1;
  } else if (blockCode === 7) {
    blockSize = view.getUint16(offset) + 1;
    offset += 2;
  }
  if (rateCode === 12) offset += 1;
  else if (rateCode === 13 || rateCode === 14) offset += 2;
  offset += 1;
  if (blockSize <= 0 || offset >= frame.byteLength) return null;
  if (view.getUint8(offset) !== VERBATIM_16_MONO) return null;
  offset += 1;
  if (offset + blockSize * 2 > frame.byteLength) return null;
  const pcm = new Int16Array(blockSize);
  for (let index = 0; index < blockSize; index += 1) pcm[index] = view.getInt16(offset + index * 2);
  return pcm;
}

export function applyGain(pcm: Int16Array, gain: number): Int16Array {
  if (gain === 1) return pcm;
  const out = new Int16Array(pcm.length);
  for (let index = 0; index < pcm.length; index += 1)
    out[index] = Math.max(-32768, Math.min(32767, Math.round((pcm[index] ?? 0) * gain)));
  return out;
}

export function levelOf(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let sum = 0;
  for (let index = 0; index < pcm.length; index += 1) {
    const sample = (pcm[index] ?? 0) / 32768;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / pcm.length);
  const db = 20 * Math.log10(Math.max(rms, 1e-5));
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export const TALK_FRAME_HEADER = [0xa8, 0x01, 0x00, 0x00] as const;

export function talkFrame(pcm: ArrayBuffer, muted: boolean): ArrayBuffer {
  const out = new Uint8Array(TALK_FRAME_HEADER.length + pcm.byteLength);
  out.set(TALK_FRAME_HEADER, 0);
  if (!muted) out.set(new Uint8Array(pcm), TALK_FRAME_HEADER.length);
  return out.buffer;
}
