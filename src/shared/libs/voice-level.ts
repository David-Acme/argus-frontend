import { makeMutable } from 'react-native-reanimated';

export const voiceLevel = makeMutable(0);

export function pcmEnvelope(samples: Int16Array, windowSamples: number): Float32Array {
  if (windowSamples <= 0 || samples.length === 0) {
    return new Float32Array(0);
  }
  const buckets = Math.ceil(samples.length / windowSamples);
  const out = new Float32Array(buckets);
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = bucket * windowSamples;
    const end = Math.min(start + windowSamples, samples.length);
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      const value = samples[i] / 32768;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    out[bucket] = Math.min(1, rms / 0.3);
  }
  return out;
}
