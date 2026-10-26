import { describe, expect, test } from 'bun:test';
import type { CallAudioDevice } from '@/core/types';
import { speakerActionOf } from '@/features/voice/model/call-speaker';

const route = (id: string, kind: CallAudioDevice['kind'], active: boolean): CallAudioDevice => ({
  id,
  kind,
  direction: 'route',
  name: id,
  active,
});

describe('the Altavoz button', () => {
  test('on the earpiece it switches to the speaker', () => {
    const speaker = route('s', 'speaker', false);
    expect(speakerActionOf([route('e', 'earpiece', true), speaker])).toEqual({
      kind: 'toggle',
      on: false,
      target: speaker,
    });
  });

  test('on the speaker it switches back to the earpiece and reads as pressed', () => {
    const earpiece = route('e', 'earpiece', false);
    expect(speakerActionOf([earpiece, route('s', 'speaker', true)])).toEqual({
      kind: 'toggle',
      on: true,
      target: earpiece,
    });
  });

  test('with headphones or bluetooth it opens the audio picker instead of guessing', () => {
    expect(speakerActionOf([route('b', 'bluetooth', true), route('s', 'speaker', false)])).toEqual({
      kind: 'pick',
      on: false,
    });
    expect(speakerActionOf([route('w', 'wired', false), route('s', 'speaker', true)])).toEqual({
      kind: 'pick',
      on: true,
    });
  });

  test('without a speaker route the button is unavailable', () => {
    expect(speakerActionOf([])).toEqual({ kind: 'none' });
    expect(speakerActionOf([{ ...route('m', 'microphone', true), direction: 'input' }])).toEqual({
      kind: 'none',
    });
    expect(speakerActionOf([route('s', 'speaker', true)])).toEqual({ kind: 'none' });
  });
});
