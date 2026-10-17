import type { SirenState } from '@/core/types';

export const SIREN_COUNTDOWN_SECONDS = 5;

export const IDLE_SIREN: SirenState = { phase: 'idle', secondsLeft: 0, startedAt: 0, until: 0 };

export type SirenAction =
  | { kind: 'ask' }
  | { kind: 'confirm'; at: number }
  | { kind: 'cancel' }
  | { kind: 'tick'; at: number }
  | { kind: 'activated'; until: number }
  | { kind: 'stop' }
  | { kind: 'close' };

export type SirenOffer = {
  allowed: boolean;
  supported: boolean;
  enabled: boolean | undefined;
};

export const sirenOffered = (offer: SirenOffer): boolean =>
  offer.allowed && offer.supported && offer.enabled !== false;

export const sirenSounding = (until: number, at: number): boolean => until > Math.floor(at / 1000);

export const sirenRemaining = (until: number, at: number): number => Math.max(0, Math.ceil(until - at / 1000));

export const sirenSecondsLeft = (elapsedMs: number): number =>
  Math.max(0, SIREN_COUNTDOWN_SECONDS - Math.floor(Math.max(0, elapsedMs) / 1000));

export const sirenCountdownFinished = (state: SirenState): boolean =>
  state.phase === 'countdown' && state.secondsLeft === 0;

export const sirenReducer = (state: SirenState, action: SirenAction): SirenState => {
  switch (action.kind) {
    case 'ask':
      return state.phase === 'idle' || state.phase === 'confirm'
        ? { phase: 'confirm', secondsLeft: 0, startedAt: 0, until: 0 }
        : state;
    case 'confirm':
      return state.phase === 'confirm'
        ? { phase: 'countdown', secondsLeft: SIREN_COUNTDOWN_SECONDS, startedAt: action.at, until: 0 }
        : state;
    case 'cancel':
      return state.phase === 'confirm' || state.phase === 'countdown' ? IDLE_SIREN : state;
    case 'tick': {
      if (state.phase !== 'countdown') return state;
      const secondsLeft = sirenSecondsLeft(action.at - state.startedAt);
      return secondsLeft === state.secondsLeft ? state : { ...state, secondsLeft };
    }
    case 'activated':
      return { phase: 'sounding', secondsLeft: 0, startedAt: 0, until: action.until };
    case 'stop':
      return state.phase === 'idle' ? state : IDLE_SIREN;
    case 'close':
      return state.phase === 'sounding' ? state : IDLE_SIREN;
  }
};
