import { makeMutable } from 'react-native-reanimated';

/**
 * Amplitude of the assistant's own voice, 0..1, written by the voice service
 * while TTS plays and read by the avatar's render worklet.
 *
 * A module-level shared value on purpose: the envelope updates ~30x per second
 * and must never trigger a React render, and both producer (a service, not a
 * component) and consumer (the avatar worklet) need the same handle.
 */
export const voiceLevel = makeMutable(0);

/** Cheap RMS envelope over 16-bit PCM. */
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
    // Speech RMS rarely passes ~0.3, so normalize there instead of at 1.0 or
    // the face barely moves.
    out[bucket] = Math.min(1, rms / 0.3);
  }
  return out;
}
