export type TypingSignalState = { active: boolean; sentAt: number };

export type TypingSignalEvent = 'typed' | 'cleared' | 'idle';

export type TypingSignalStep = { state: TypingSignalState; emit: boolean | null };

export type TypingSignalInput = {
  state: TypingSignalState;
  event: TypingSignalEvent;
  now: number;
  refreshMs: number;
};

export const TYPING_SIGNAL_IDLE: TypingSignalState = { active: false, sentAt: 0 };

export function nextTypingSignal({
  state,
  event,
  now,
  refreshMs,
}: TypingSignalInput): TypingSignalStep {
  if (event !== 'typed') {
    return state.active ? { state: TYPING_SIGNAL_IDLE, emit: false } : { state, emit: null };
  }
  if (state.active && now - state.sentAt < refreshMs) return { state, emit: null };
  return { state: { active: true, sentAt: now }, emit: true };
}
