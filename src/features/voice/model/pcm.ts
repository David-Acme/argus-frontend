export function pcmChunk(bytes: ArrayBuffer): Int16Array {
  return new Int16Array(bytes, 0, bytes.byteLength >> 1);
}

export function pcmToBytes(samples: Int16Array): ArrayBuffer {
  return samples.slice().buffer;
}

export function concatPcm(parts: readonly Int16Array[], total: number): Int16Array<ArrayBuffer> {
  const merged = new Int16Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

export function pcmRms(samples: Int16Array, start = 0, end = samples.length): number {
  const from = Math.max(0, start);
  const to = Math.min(samples.length, end);
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i += 1) {
    const value = (samples[i] ?? 0) / 32768;
    sum += value * value;
  }
  return Math.sqrt(sum / (to - from));
}
