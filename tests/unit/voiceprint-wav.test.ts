import { describe, expect, test } from 'bun:test';
import {
  concatPcm,
  encodeWav,
  floatToPcm16,
  levelOf,
  MODEL_SAMPLE_RATE,
  toBase64,
} from '@/features/voiceprint/model/wav';

function pcmBuffer(values: number[]): ArrayBuffer {
  return new Int16Array(values).buffer;
}

describe('voiceprint WAV encoding', () => {
  test('chunks from the microphone join in order', () => {
    expect(Array.from(concatPcm([pcmBuffer([1, 2]), pcmBuffer([]), pcmBuffer([-3])]))).toEqual([1, 2, -3]);
  });

  test('a trailing odd byte is not read as a sample', () => {
    expect(concatPcm([new Uint8Array([1, 0, 9]).buffer]).length).toBe(1);
  });

  test('float samples clamp to the 16-bit range', () => {
    expect(Array.from(floatToPcm16(new Float32Array([0, 1, -1, 2, -2, 0.5])))).toEqual([
      0, 32767, -32768, 32767, -32768, 16384,
    ]);
  });

  test('the header is a mono 16-bit PCM WAV at the model rate', () => {
    const wav = encodeWav(new Int16Array([0x1234, -2]), MODEL_SAMPLE_RATE);
    const view = new DataView(wav.buffer);
    const tag = (offset: number) => String.fromCharCode(...wav.slice(offset, offset + 4));
    expect(wav.length).toBe(48);
    expect(tag(0)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(40);
    expect(tag(8)).toBe('WAVE');
    expect(tag(12)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(tag(36)).toBe('data');
    expect(view.getUint32(40, true)).toBe(4);
    expect(view.getInt16(44, true)).toBe(0x1234);
    expect(view.getInt16(46, true)).toBe(-2);
  });

  test('base64 matches the platform encoder, padding included', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 255]) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 37 + 11) % 256);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });

  test('the level meter reads silence as zero and full scale as one', () => {
    expect(levelOf(new Int16Array(0))).toBe(0);
    expect(levelOf(new Int16Array(320))).toBe(0);
    expect(levelOf(new Float32Array(320).fill(1))).toBe(1);
    const quiet = levelOf(new Float32Array(320).fill(0.01));
    const loud = levelOf(new Float32Array(320).fill(0.3));
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
    expect(loud).toBeLessThan(1);
  });
});
