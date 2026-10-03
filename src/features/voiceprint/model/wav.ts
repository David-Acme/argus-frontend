export const MODEL_SAMPLE_RATE = 16000;

const WAV_HEADER_BYTES = 44;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LEVEL_FLOOR_DB = -60;

export function concatPcm(chunks: readonly ArrayBuffer[]): Int16Array {
  const total = chunks.reduce((sum, chunk) => sum + Math.floor(chunk.byteLength / 2), 0);
  const samples = new Int16Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    const view = new Int16Array(chunk, 0, Math.floor(chunk.byteLength / 2));
    samples.set(view, offset);
    offset += view.length;
  }
  return samples;
}

export function floatToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = Math.round(clamped < 0 ? clamped * 32768 : clamped * 32767);
  }
  return pcm;
}

export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(WAV_HEADER_BYTES + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeTag = (offset: number, tag: string) => {
    for (let index = 0; index < tag.length; index += 1) view.setUint8(offset + index, tag.charCodeAt(index));
  };
  writeTag(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeTag(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(WAV_HEADER_BYTES + index * 2, sample, true));
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triple = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    parts.push(
      BASE64_ALPHABET.charAt((triple >> 18) & 63) +
        BASE64_ALPHABET.charAt((triple >> 12) & 63) +
        (second === undefined ? '=' : BASE64_ALPHABET.charAt((triple >> 6) & 63)) +
        (third === undefined ? '=' : BASE64_ALPHABET.charAt(triple & 63)),
    );
  }
  return parts.join('');
}

export function levelOf(samples: Int16Array | Float32Array): number {
  if (samples.length === 0) return 0;
  const scale = samples instanceof Int16Array ? 32768 : 1;
  let energy = 0;
  for (const sample of samples) energy += (sample / scale) ** 2;
  const rms = Math.sqrt(energy / samples.length);
  if (rms <= 0) return 0;
  const decibels = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (decibels - LEVEL_FLOOR_DB) / -LEVEL_FLOOR_DB));
}
