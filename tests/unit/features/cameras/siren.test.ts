import { describe, expect, test } from 'bun:test';
import {
  IDLE_SIREN,
  sirenOffered,
  SIREN_COUNTDOWN_SECONDS,
  sirenCountdownFinished,
  sirenReducer,
  sirenRemaining,
  sirenSecondsLeft,
  sirenSounding,
} from '@/features/cameras/model/siren';
import type { SirenState } from '@/core/types';

const asked = sirenReducer(IDLE_SIREN, { kind: 'ask' });
const counting = sirenReducer(asked, { kind: 'confirm', at: 1_000 });

const tickAt = (state: SirenState, at: number): SirenState => sirenReducer(state, { kind: 'tick', at });

describe('who is offered the siren', () => {
  const offered = (allowed: boolean, supported: boolean, enabled: boolean | undefined) =>
    sirenOffered({ allowed, supported, enabled });

  test('resident and guard see it, a guest never, whatever the switch says', () => {
    expect(offered(true, true, true)).toBe(true);
    expect(offered(false, true, true)).toBe(false);
    expect(offered(false, true, undefined)).toBe(false);
  });

  test('a camera with no siren feature is never offered one', () => {
    expect(offered(true, false, true)).toBe(false);
  });

  test('the switch off hides the button, and a server that does not answer it keeps it', () => {
    expect(offered(true, true, false)).toBe(false);
    expect(offered(true, true, undefined)).toBe(true);
  });
});

describe('the siren countdown', () => {
  test('the confirmation is one step, not the siren', () => {
    expect(asked.phase).toBe('confirm');
    expect(sirenCountdownFinished(asked)).toBe(false);
    expect(asked.until).toBe(0);
  });

  test('confirming counts five seconds down, one a second', () => {
    expect(counting.phase).toBe('countdown');
    expect(counting.secondsLeft).toBe(SIREN_COUNTDOWN_SECONDS);
    expect(tickAt(counting, 1_999).secondsLeft).toBe(SIREN_COUNTDOWN_SECONDS);
    expect(tickAt(counting, 2_000).secondsLeft).toBe(4);
    expect(tickAt(counting, 3_500).secondsLeft).toBe(3);
    expect(tickAt(counting, 4_500).secondsLeft).toBe(2);
    expect(tickAt(counting, 5_500).secondsLeft).toBe(1);
  });

  test('the countdown is finished exactly at five seconds', () => {
    const atFour = tickAt(counting, 5_999);
    expect(sirenCountdownFinished(atFour)).toBe(false);
    const atFive = tickAt(counting, 6_000);
    expect(sirenCountdownFinished(atFive)).toBe(true);
    expect(atFive.phase).toBe('countdown');
  });

  test('a tick outside the countdown changes nothing', () => {
    expect(tickAt(IDLE_SIREN, 9_000)).toBe(IDLE_SIREN);
    expect(sirenSecondsLeft(-500)).toBe(SIREN_COUNTDOWN_SECONDS);
  });
});

describe('cancelling', () => {
  test('cancel leaves the confirmation and the countdown without sounding', () => {
    expect(sirenReducer(asked, { kind: 'cancel' })).toBe(IDLE_SIREN);
    expect(sirenReducer(counting, { kind: 'cancel' })).toBe(IDLE_SIREN);
    expect(sirenReducer(tickAt(counting, 4_800), { kind: 'cancel' })).toBe(IDLE_SIREN);
  });

  test('a cancelled countdown cannot finish, and asking again starts clean', () => {
    const cancelled = sirenReducer(tickAt(counting, 5_800), { kind: 'cancel' });
    expect(sirenCountdownFinished(tickAt(cancelled, 7_000))).toBe(false);
    expect(tickAt(cancelled, 7_000)).toBe(IDLE_SIREN);

    const again = sirenReducer(sirenReducer(cancelled, { kind: 'ask' }), { kind: 'confirm', at: 9_000 });
    expect(again.secondsLeft).toBe(SIREN_COUNTDOWN_SECONDS);
    expect(tickAt(again, 9_400).secondsLeft).toBe(SIREN_COUNTDOWN_SECONDS);
    expect(sirenCountdownFinished(tickAt(again, 13_999))).toBe(false);
    expect(sirenCountdownFinished(tickAt(again, 14_000))).toBe(true);
  });
});

describe('while the siren sounds', () => {
  const sounding = sirenReducer(counting, { kind: 'activated', until: 1_020 });

  test('the lease is what keeps it sounding', () => {
    expect(sounding.phase).toBe('sounding');
    expect(sirenSounding(sounding.until, 1_019_999)).toBe(true);
    expect(sirenSounding(sounding.until, 1_020_000)).toBe(false);
    expect(sirenRemaining(sounding.until, 1_015_000)).toBe(5);
    expect(sirenRemaining(sounding.until, 1_025_000)).toBe(0);
  });

  test('closing the sheet never silences it, stopping does', () => {
    expect(sirenReducer(sounding, { kind: 'close' })).toBe(sounding);
    expect(sirenReducer(counting, { kind: 'close' })).toBe(IDLE_SIREN);
    expect(sirenReducer(asked, { kind: 'close' })).toBe(IDLE_SIREN);
    expect(sirenReducer(sounding, { kind: 'stop' })).toBe(IDLE_SIREN);
  });

  test('asking while it sounds keeps the siren, one tap stops it', () => {
    expect(sirenReducer(sounding, { kind: 'ask' })).toBe(sounding);
    expect(sirenReducer(sounding, { kind: 'cancel' })).toBe(sounding);
  });
});
