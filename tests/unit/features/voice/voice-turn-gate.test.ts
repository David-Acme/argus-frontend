import { describe, expect, test } from 'bun:test';
import {
  INITIAL_TURN_GATE,
  assistantTurnKey,
  gateAcceptsAudio,
  gateOnInterrupted,
  gateOnSkip,
  gateOnTurn,
  gateOnUserFinal,
  shouldSendMic,
} from '@/features/voice/services/voice/voice-turn-gate';

describe('turn gate against a duplex server', () => {
  test('a skip discards audio until the next turn starts', () => {
    const skipped = gateOnSkip(gateOnTurn('1'));
    expect(gateAcceptsAudio(skipped)).toBe(false);
    expect(gateAcceptsAudio(gateOnUserFinal(skipped))).toBe(false);
    expect(gateAcceptsAudio(gateOnTurn('2'))).toBe(true);
  });

  test('an interruption of the current turn flushes and discards its late audio', () => {
    const outcome = gateOnInterrupted(gateOnTurn('4'), '4');
    expect(outcome.flush).toBe(true);
    expect(gateAcceptsAudio(outcome.gate)).toBe(false);
  });

  test('an interruption of an older turn leaves the current turn playing', () => {
    const current = gateOnTurn('5');
    const outcome = gateOnInterrupted(current, '4');
    expect(outcome.flush).toBe(false);
    expect(outcome.gate).toBe(current);
  });

  test('assistant lines are keyed by the server turn id', () => {
    expect(assistantTurnKey(gateOnTurn('9'), 3)).toBe('turn-9');
  });
});

describe('turn gate against a half-duplex server', () => {
  test('a skip discards audio until the user finishes a new utterance', () => {
    const skipped = gateOnSkip(INITIAL_TURN_GATE);
    expect(gateAcceptsAudio(skipped)).toBe(false);
    expect(gateAcceptsAudio(gateOnUserFinal(skipped))).toBe(true);
  });

  test('assistant lines fall back to the local turn counter', () => {
    expect(assistantTurnKey(INITIAL_TURN_GATE, 3)).toBe('local-3');
  });
});

describe('shouldSendMic', () => {
  test('muted never sends', () => {
    expect(shouldSendMic({ muted: true, turnAware: true, playing: false })).toBe(false);
  });

  test('a duplex server hears the user while the assistant speaks', () => {
    expect(shouldSendMic({ muted: false, turnAware: true, playing: true })).toBe(true);
  });

  test('a half-duplex server gets no audio while the assistant speaks', () => {
    expect(shouldSendMic({ muted: false, turnAware: false, playing: true })).toBe(false);
    expect(shouldSendMic({ muted: false, turnAware: false, playing: false })).toBe(true);
  });
});
