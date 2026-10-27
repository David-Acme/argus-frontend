import { describe, expect, test } from 'bun:test';
import { cancelProgress, holdDecision } from '@/features/conversations/model/hold-record';
import {
  barToneOf,
  bucketPeaks,
  keepsNote,
  levelOfDecibels,
  nextSpeed,
  noteClock,
  noteFileOf,
  noteMimeOf,
  progressOf,
  transcriptFolds,
  withLevel,
} from '@/features/conversations/model/voice-note';

describe('a recorded voice note', () => {
  test('is uploaded as the audio part with the extension of its container', () => {
    expect(noteFileOf({ uri: 'file:///n.m4a', mime: 'audio/mp4' })).toEqual({
      name: 'audio',
      uri: 'file:///n.m4a',
      filename: 'note.m4a',
      contentType: 'audio/mp4',
    });
    expect(noteFileOf({ uri: 'data:audio/webm;base64,AA', mime: 'audio/webm' }).filename).toBe(
      'note.webm'
    );
  });

  test('reads the container the recorder produced, Opus or AAC, and refuses anything else', () => {
    expect(noteMimeOf('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(noteMimeOf('audio/ogg; codecs=opus')).toBe('audio/ogg');
    expect(noteMimeOf('audio/x-m4a')).toBe('audio/mp4');
    expect(noteMimeOf('audio/wav')).toBeNull();
  });

  test('keeps 48 peaks scaled to the loudest moment, and silence as zeros', () => {
    const peaks = bucketPeaks([0.1, 0.5, 0.25, 1, 0.5]);
    expect(peaks).toHaveLength(48);
    expect(Math.max(...peaks)).toBe(100);
    expect(bucketPeaks([])).toEqual(Array.from({ length: 48 }, () => 0));
  });

  test('a press shorter than the server floor is not a note', () => {
    expect(keepsNote(299, 300)).toBe(false);
    expect(keepsNote(300, 300)).toBe(true);
  });

  test('the live level comes from decibels and the live wave keeps the newest bars', () => {
    expect(levelOfDecibels(-60)).toBe(0);
    expect(levelOfDecibels(0)).toBe(1);
    expect(levelOfDecibels(undefined)).toBe(0);
    expect(withLevel([0.1, 0.2, 0.3], 0.4, 3)).toEqual([0.2, 0.3, 0.4]);
  });
});

describe('playing a note', () => {
  test('shows the clock, the progress and cycles 1×, 1.5× and 2×', () => {
    expect(noteClock(12_400)).toBe('0:12');
    expect(noteClock(75_000)).toBe('1:15');
    expect(progressOf(3000, 12_000)).toBe(0.25);
    expect(progressOf(1, 0)).toBe(0);
    expect(nextSpeed(1)).toBe(1.5);
    expect(nextSpeed(1.5)).toBe(2);
    expect(nextSpeed(2)).toBe(1);
  });
});

describe('holding the microphone', () => {
  test('sliding left cancels, sliding up locks, and a small wobble keeps recording', () => {
    const limits = { cancelPx: 96, lockPx: 72 };
    expect(holdDecision({ dx: -100, dy: -10 }, limits)).toBe('cancel');
    expect(holdDecision({ dx: -10, dy: -80 }, limits)).toBe('lock');
    expect(holdDecision({ dx: -20, dy: -20 }, limits)).toBe('hold');
    expect(cancelProgress(-48, 96)).toBe(0.5);
    expect(cancelProgress(30, 96)).toBe(0);
  });
});

describe('a voice note bubble', () => {
  test('the played part takes the accent only while the note plays', () => {
    expect(barToneOf(3, 10, true)).toBe('played');
    expect(barToneOf(12, 10, true)).toBe('rest');
    expect(barToneOf(3, 10, false)).toBe('rest');
  });

  test('a transcript longer than two lines folds behind «Ver más»', () => {
    expect(transcriptFolds('Compra pan')).toBe(false);
    expect(transcriptFolds('Hola, Argus, quería saber qué tengo pendiente para mañana.')).toBe(true);
  });
});
