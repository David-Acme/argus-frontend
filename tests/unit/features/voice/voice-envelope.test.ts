import { describe, expect, test } from 'bun:test';
import { PlayoutEnvelope, envelopeLevel } from '@/features/voice/services/voice/voice-envelope';
import { concatPcm, pcmChunk, pcmRms } from '@/features/voice/model/pcm';

function constant(value: number, length: number): Int16Array {
  return new Int16Array(length).fill(value);
}

describe('PlayoutEnvelope', () => {
  test('the level follows the playout position across written chunks', () => {
    const envelope = new PlayoutEnvelope(4);
    envelope.append(constant(0, 8));
    envelope.append(constant(9830, 8));
    expect(envelope.writtenSamples).toBe(16);
    expect(envelope.levelAt(0)).toBe(0);
    expect(envelope.levelAt(10)).toBeCloseTo(envelopeLevel(9830 / 32768), 5);
    expect(envelope.levelAt(16)).toBe(0);
  });

  test('skipping to the written position drops everything queued', () => {
    const envelope = new PlayoutEnvelope(4);
    envelope.append(constant(16000, 12));
    envelope.levelAt(envelope.writtenSamples);
    envelope.append(constant(16000, 4));
    expect(envelope.levelAt(12)).toBeGreaterThan(0);
  });

  test('reset rewinds the timeline to zero', () => {
    const envelope = new PlayoutEnvelope(4);
    envelope.append(constant(16000, 8));
    envelope.reset();
    expect(envelope.writtenSamples).toBe(0);
    expect(envelope.levelAt(0)).toBe(0);
  });
});

describe('pcm helpers', () => {
  test('an odd byte length keeps only whole samples', () => {
    expect(pcmChunk(new ArrayBuffer(5)).length).toBe(2);
  });

  test('concatPcm joins parts in order', () => {
    const merged = concatPcm([Int16Array.of(1, 2), Int16Array.of(3)], 3);
    expect(Array.from(merged)).toEqual([1, 2, 3]);
  });

  test('pcmRms of a full-scale constant is one', () => {
    expect(pcmRms(constant(-32768, 4))).toBe(1);
    expect(pcmRms(new Int16Array(0))).toBe(0);
  });
});
